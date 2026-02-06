use anchor_lang::prelude::*;
use crate::states::{Pool, ErrorCode, RESOLVER_STATIC_FEE, SERVICE_FEE_BPS};

#[derive(Accounts)]
pub struct Payout<'info> {
    /// User that is resolving
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Current lottery pool
    #[account(
        mut,
        constraint = pool.status == 3 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// Current lottery pool
    #[account(
        mut,
        address = pool.winner @ ErrorCode::WrongWinnerAccount,
    )]
    pub winner: SystemAccount<'info>,

    /// Fee account
    #[account(
        mut,
        address = crate::states::FEE_ACCOUNT @ ErrorCode::WrongFeeAccount,
    )]
    pub fee: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn payout(ctx: Context<Payout>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let winner = &mut ctx.accounts.winner;
    let fee = &mut ctx.accounts.fee;
    let signer = &mut ctx.accounts.signer;

    let mut total_amount = pool.total_entries;
    pool.status = 4;

    if total_amount == 0 {
        return Ok(());
    }

    let resolver_fee = if total_amount < RESOLVER_STATIC_FEE {
        total_amount
    } else {
        RESOLVER_STATIC_FEE
    };

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: pool.to_account_info(),
                to: signer.to_account_info(),
            },
        ),
        resolver_fee,
    )?;

    total_amount = total_amount.saturating_sub(resolver_fee);
    if total_amount == 0 {
        return Ok(());
    }

    let service_fee_amount = total_amount * SERVICE_FEE_BPS / 10_000;
    let current_winner_lamports = winner.lamports();
    let winner_rent_exemption = Rent::get()?.minimum_balance(winner.data_len());
    let needed_for_rent_exemption = winner_rent_exemption.saturating_sub(current_winner_lamports);
    let service_fee = if total_amount < service_fee_amount + needed_for_rent_exemption {
        total_amount
    } else {
        service_fee_amount
    };

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: pool.to_account_info(),
                to: fee.to_account_info(),
            },
        ),
        service_fee,
    )?;

    total_amount = total_amount.saturating_sub(service_fee);
    if total_amount == 0 {
        return Ok(());
    }

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: pool.to_account_info(),
                to: winner.to_account_info(),
            },
        ),
        total_amount,
    )?;

    Ok(())
}