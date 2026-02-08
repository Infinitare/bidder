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
        seeds = [b"pool", pool.day_id.to_le_bytes().as_ref()],
        bump,
        constraint = pool.status == 3 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Current lottery pool vault
    #[account(
        mut,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

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
    let vault = &mut ctx.accounts.vault;
    let winner = &mut ctx.accounts.winner;
    let fee = &mut ctx.accounts.fee;
    let signer = &mut ctx.accounts.signer;

    let mut total_amount = vault.lamports();
    pool.status = 4;

    if total_amount == 0 {
        return Ok(());
    }

    let resolver_fee = if total_amount < RESOLVER_STATIC_FEE {
        total_amount
    } else {
        RESOLVER_STATIC_FEE
    };

    let pool_key = pool.key();
    let seeds: &[&[u8]] = &[
        b"vault",
        pool_key.as_ref(),
        &[ctx.bumps.vault],
    ];

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: vault.to_account_info(),
                to: signer.to_account_info(),
            },
            &[seeds],
        ),
        resolver_fee,
    )?;

    total_amount = vault.lamports();
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
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: vault.to_account_info(),
                to: fee.to_account_info(),
            },
            &[seeds],
        ),
        service_fee,
    )?;

    total_amount = vault.lamports();
    if total_amount == 0 {
        return Ok(());
    }

    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: vault.to_account_info(),
                to: winner.to_account_info(),
            },
            &[seeds],
        ),
        total_amount,
    )?;

    Ok(())
}