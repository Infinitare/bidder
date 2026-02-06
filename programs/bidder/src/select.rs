use anchor_lang::prelude::*;
use switchboard_on_demand::RandomnessAccountData;
use crate::states::{Pool, ErrorCode, Pages};

#[derive(Accounts)]
pub struct Select<'info> {
    /// User that is resolving
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Current lottery pool
    #[account(
        mut,
        constraint = pool.status == 1 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// Pages for entries
    #[account(
        seeds = [b"pages", pool.key().as_ref()],
        bump,
    )]
    pub pages: Account<'info, Pages>,

    /// CHECK: Validated manually in handler
    pub randomness_account_data: AccountInfo<'info>,
}

pub fn select(ctx: Context<Select>) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;
    let pages = &mut ctx.accounts.pages;

    if ctx.accounts.randomness_account_data.key() != pool.randomness_account {
        return Err(ErrorCode::InvalidRandomnessAccount.into());
    }

    let randomness_data = RandomnessAccountData::parse(
        ctx.accounts.randomness_account_data.data.borrow()
    ).map_err(|_| ErrorCode::InvalidRandomnessAccount)?;

    if randomness_data.seed_slot != pool.close_slot {
        return Err(ErrorCode::RandomnessExpired.into());
    }

    let revealed_random_value = randomness_data
        .get_value(clock.slot)
        .map_err(|_| ErrorCode::RandomnessNotResolved)?;

    let random_number = u64::from_le_bytes(
        revealed_random_value[0..8]
            .try_into()
            .map_err(|_| ErrorCode::RandomnessValueError)?
    );
    pool.winning_entry = (random_number % pool.total_entries) + 1;
    pool.status = 2;

    let mut current_count = 0;
    for i in 0..pages.entries.len() {
        let amount = &pages.entries[i];
        current_count += *amount;
        if current_count >= pool.winning_entry {
            pool.winning_page = i as u64;
            break;
        }
    }

    Ok(())
}
