mod entry;
mod resolve;
mod states;
mod select;
mod payout;
mod close;

use anchor_lang::prelude::*;
use entry::*;
use close::*;
use select::*;
use resolve::*;
use payout::*;

declare_id!("JtMSXSCDbJ6ZDLwMFLXLmLZWLD1VGwzxUsA57nefbdr");

#[program]
pub mod bidder {
    use super::*;

    pub fn entry(ctx: Context<Entry>, amount: u64, day_id: i64) -> Result<()> {
        entry::entry(ctx, amount, day_id)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        close::close(ctx)
    }

    pub fn select(ctx: Context<Select>) -> Result<()> {
        select::select(ctx)
    }

    pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
        resolve::resolve(ctx)
    }

    pub fn payout(ctx: Context<Payout>) -> Result<()> {
        payout::payout(ctx)
    }
}
