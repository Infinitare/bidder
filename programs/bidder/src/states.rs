use anchor_lang::prelude::*;
use anchor_lang::{account};

pub const FEE_ACCOUNT: Pubkey = pubkey!("TjgnAqExKJKAGmWKxr5sKuZE648nwvqYE8c4MQVqbdr");
pub const RESOLVER_STATIC_FEE: u64 = 20000000;
pub const SERVICE_FEE_BPS: u64 = 100; // 1%

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow occurred")]
    Overflow,

    #[msg("The provided day ID does not match the current day")]
    BadDayId,

    #[msg("The lottery pool is closed for entries")]
    PoolClosed,

    #[msg("The amount must be greater than zero")]
    InvalidAmount,

    #[msg("The current page is already full")]
    PageFull,

    #[msg("The provided fee account is incorrect")]
    WrongFeeAccount,

    #[msg("The provided winner account is incorrect")]
    WrongWinnerAccount,

    #[msg("The randomness has already expired")]
    RandomnessExpired,

    #[msg("The randomness has already been revealed")]
    RandomnessAlreadyRevealed,

    #[msg("The provided randomness account is invalid")]
    InvalidRandomnessAccount,

    #[msg("The randomness has not been resolved yet")]
    RandomnessNotResolved,

    #[msg("The provided randomness value is invalid")]
    RandomnessValueError,

    #[msg("The provided account owner is invalid")]
    InvalidAccountOwner,

    #[msg("The provided account state is invalid")]
    InvalidAccountState
}

#[account]
pub struct Pool {
    pub status: u8,
    pub total_entries: u64,
    pub current_page: u64,
    pub day_id: i64,
    pub close_slot: u64,
    pub randomness_account: Pubkey,
    pub winning_entry: u64,
    pub winning_page: u64,
    pub winner: Pubkey,
}

pub const POOL_SIZE: usize = 8 + 1 + 8 + 8 + 8 + 8 + 32 + 8 + 8 + 32;

#[account]
#[derive(Default,)]
pub struct Pages {
    pub entries: Vec<u64>,
}

pub const PAGES_ENTRY: usize = 8;
pub const PAGES_BASE: usize = 8 + 4;

#[account]
#[derive(Default)]
pub struct Page {
    pub offset_entries: u64,
    pub entries: Vec<PageEntry>,
}

#[account]
#[derive(Default)]
pub struct PageEntry {
    pub user: Pubkey,
    pub amount: u64,
}

pub const PAGE_ENTRY: usize = 32 + 8;
pub const PAGE_BASE: usize = 8 + 8 + 4;

#[account]
pub struct User {
    pub entries: u64,
}

pub const USER_SIZE: usize = 8 + 8;
