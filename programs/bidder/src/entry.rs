use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, transfer};
use crate::states::{Pool, User, POOL_SIZE, USER_SIZE, PAGE_BASE, PAGES_BASE, ErrorCode, Page, PAGE_ENTRY, Pages, PAGES_ENTRY, PageEntry};

#[derive(Accounts)]
#[instruction(amount: u64, day_id: i64)]
pub struct Entry<'info> {
    /// User that is making the entry
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Current lottery pool
    #[account(
        init_if_needed,
        space = POOL_SIZE,
        payer = signer,
        seeds = [b"pool", day_id.to_le_bytes().as_ref()],
        bump,
        constraint = pool.status == 0 @ ErrorCode::PoolClosed,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Current lottery pool vault
    #[account(
        init_if_needed,
        payer = signer,
        space = 0,
        seeds = [b"vault", pool.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    /// Pages for entries
    #[account(
        mut,
        seeds = [b"pages", pool.key().as_ref()],
        bump,
    )]
    pub pages: Account<'info, Pages>,

    /// Current page for entries
    #[account(
        mut,
        seeds = [b"page", pool.key().as_ref(), pool.current_page.to_le_bytes().as_ref()],
        bump,
        constraint = page.entries.len() < 100 @ ErrorCode::PageFull
    )]
    pub page: Account<'info, Page>,

    /// User data
    #[account(
        init_if_needed,
        payer = signer,
        space = USER_SIZE,
        seeds = [b"user", pool.key().as_ref(), signer.key().as_ref()],
        bump,
    )]
    pub user: Account<'info, User>,

    pub system_program: Program<'info, System>,
}

fn init_account_if_needed<'info, T: AnchorSerialize + AnchorDeserialize + Discriminator + Owner + Default>(
    payer: &AccountInfo<'info>,
    acct: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    space: usize,
) -> Result<()> {
    if acct.owner == &crate::ID {
        // already initialized
        return Ok(());
    }

    require!(acct.owner == &system_program::ID, ErrorCode::InvalidAccountOwner);
    require!(acct.data_len() == 0, ErrorCode::InvalidAccountState);

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);

    let ix = anchor_lang::system_program::CreateAccount {
        from: payer.clone(),
        to: acct.clone(),
    };

    create_account(
        CpiContext::new(system_program.clone(), ix),
        lamports,
        space as u64,
        &crate::ID,
    )?;

    let mut data = acct.try_borrow_mut_data()?;
    let mut cursor = std::io::Cursor::new(&mut data[..]);
    let v = T::default();
    v.serialize(&mut cursor)?;
    Ok(())
}

fn realloc_to_fit<'info>(
    payer: &AccountInfo<'info>,
    target: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    new_size: usize,
) -> Result<()> {
    let rent = Rent::get()?;
    let needed = rent.minimum_balance(new_size);
    let have = target.lamports();

    if needed > have {
        let diff = needed - have;
        transfer(
            CpiContext::new(
                system_program.clone(),
                anchor_lang::system_program::Transfer {
                    from: payer.clone(),
                    to: target.clone(),
                },
            ),
            diff,
        )?;
    }

    target.resize(new_size)?;
    Ok(())
}

pub fn entry(ctx: Context<Entry>, amount: u64, day_id: i64) -> Result<()> {
    // UTC timestamp
    let now = Clock::get()?.unix_timestamp;
    let expected_day_id = now / 86_400;
    require!(day_id == expected_day_id, ErrorCode::BadDayId);
    require!(amount > 0, ErrorCode::InvalidAmount);

    init_account_if_needed::<Pages>(
        &ctx.accounts.signer.to_account_info(),
        &ctx.accounts.pages.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        PAGES_BASE,
    )?;

    init_account_if_needed::<Page>(
        &ctx.accounts.signer.to_account_info(),
        &ctx.accounts.page.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        PAGE_BASE,
    )?;

    ctx.accounts.pages.reload()?;
    ctx.accounts.page.reload()?;

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let user = &mut ctx.accounts.user;
    user.entries = user.entries.checked_add(amount).ok_or(ErrorCode::Overflow)?;

    let pool = &mut ctx.accounts.pool;
    if pool.day_id == 0 {
        pool.day_id = day_id;
    }

    let page = &mut ctx.accounts.page;
    if page.entries.is_empty() {
        page.offset_entries = pool.total_entries;
    }
    pool.total_entries = pool.total_entries.checked_add(amount).ok_or(ErrorCode::Overflow)?;

    let new_size = PAGE_ENTRY * (page.entries.len() + 1) + PAGE_BASE;
    realloc_to_fit(
        &ctx.accounts.signer.to_account_info(),
        &page.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        new_size
    )?;

    page.entries.push(PageEntry {
        user: ctx.accounts.signer.key(),
        amount,
    });

    let pages = &mut ctx.accounts.pages;
    let entry = pages.entries.get_mut(pool.current_page as usize);
    match entry {
        Some(e) => {
            *e = e.checked_add(amount).ok_or(ErrorCode::Overflow)?;
        },
        None => {
            let new_size = PAGES_ENTRY * (pages.entries.len() + 1) + PAGES_BASE;
            realloc_to_fit(
                &ctx.accounts.signer.to_account_info(),
                &pages.to_account_info(),
                &ctx.accounts.system_program.to_account_info(),
                new_size
            )?;
            pages.entries.push(amount);
        }
    }

    if page.entries.len() as u64 >= 100 {
        pool.current_page = pool.current_page.checked_add(1).ok_or(ErrorCode::Overflow)?;
    }

    Ok(())
}
