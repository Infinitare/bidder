use anchor_lang::prelude::*;
use switchboard_on_demand::{RandomnessAccountData, SWITCHBOARD_PROGRAM_ID};
use crate::states::{Pool, ErrorCode, Pages};

#[derive(Accounts)]
pub struct Close<'info> {
    /// User that is resolving
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Current lottery pool
    #[account(
        mut,
        constraint = pool.status == 0 || pool.status == 1 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// Pages for entries
    #[account(
        seeds = [b"pages", pool.key().as_ref()],
        bump,
    )]
    pub pages: Account<'info, Pages>,

    /// CHECK: Validated manually in handler
    #[account(
        owner = SWITCHBOARD_PROGRAM_ID
    )]
    pub randomness_account_data: AccountInfo<'info>,
}

pub fn close(ctx: Context<Close>) -> Result<()> {
    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;
    if pool.status == 1 {
        // if last attempt to resolve failed (longer then 30 slots ago), allow retry
        if clock.slot < pool.close_slot + 30 {
            return Err(ErrorCode::PoolClosed.into());
        }
    } else {
        pool.status = 1;
    }

    if pool.total_entries == 0 {
        msg!("No entries, closing");
        pool.status = 4;
        return Ok(());
    }
    
    let randomness_data = RandomnessAccountData::parse(
        ctx.accounts.randomness_account_data.data.borrow()
    ).map_err(|_| ErrorCode::InvalidRandomnessAccount)?;

    if randomness_data.seed_slot != clock.slot - 1 {
        return Err(ErrorCode::RandomnessExpired.into());
    }

    if !randomness_data.get_value(clock.slot).is_err() {
        return Err(ErrorCode::RandomnessAlreadyRevealed.into());
    }

    pool.close_slot = clock.slot;
    pool.randomness_account = ctx.accounts.randomness_account_data.key();

    Ok(())
}
