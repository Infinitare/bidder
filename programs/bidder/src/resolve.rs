use crate::states::{ErrorCode, Page, Pool};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Resolve<'info> {
    /// User that is resolving
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Current lottery pool
    #[account(
        mut,
        constraint = pool.status == 2 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// Current page for entries
    #[account(
        mut,
        seeds = [b"page", pool.key().as_ref(), pool.winning_page.to_le_bytes().as_ref()],
        bump,
    )]
    pub page: Account<'info, Page>,
}

pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let page = &mut ctx.accounts.page;

    let mut current_count = page.offset_entries;
    for entry in page.entries.iter() {
        current_count += entry.amount;
        if current_count >= pool.winning_entry {
            pool.winner = entry.user;
            pool.status = 3;
            break;
        }
    }

    if pool.winner == Pubkey::default() {
        return Err(ErrorCode::Overflow.into());
    }

    Ok(())
}
