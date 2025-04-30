use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::store::{LookupMap, UnorderedSet};
// Import standard HashMap
use std::collections::HashMap;
use near_sdk::json_types::U64;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault, Promise, NearToken, BorshStorageKey, log};
use serde_json;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct NFTMetadata {
    pub title: String,
    pub description: String,
    pub media: String, // URL to the MP3 file
    pub media_hash: String,
    pub price_per_copy: near_sdk::json_types::U128, // Changed to U128 for JSON compatibility
    pub cover_photo: String,
}

// Add this new struct for mint parameters
#[derive(Serialize, Deserialize, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct SftMintArgs {
    pub token_class_id: String,
    pub amount: U64,
    pub receiver_id: AccountId,
    pub metadata: Option<NFTMetadata>,
}

// Add this new struct to combine class ID and metadata for return
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct TokenClassMetadata {
    pub token_class_id: String,
    pub metadata: NFTMetadata,
    pub creator_id: AccountId,
}

// --- NEP-297 Event Standard --- 

#[derive(Serialize, Debug)]
#[serde(crate = "near_sdk::serde")]
struct Nep297Event<'a> {
    standard: &'a str, // Always "nep297"
    version: &'a str,  // e.g., "1.0.0"
    event: &'a str,    // e.g., "sft_transfer"
    data: Vec<serde_json::Value>, // Array of event data structs
}

#[derive(Serialize, Debug)]
#[serde(crate = "near_sdk::serde")]
struct SftTransferLogData {
    owner_id: AccountId,
    receiver_id: AccountId,
    token_class_id: String,
    amount: U64,
    #[serde(skip_serializing_if = "Option::is_none")]
    memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    authorized_id: Option<AccountId>, // For transfer_from
}

#[derive(Serialize, Debug)]
#[serde(crate = "near_sdk::serde")]
struct SftApproveLogData {
    owner_id: AccountId,
    approved_account_id: AccountId,
    token_class_id: String,
    amount: U64,
}

#[derive(Serialize, Debug)]
#[serde(crate = "near_sdk::serde")]
struct SftRevokeLogData {
    owner_id: AccountId,
    revoked_account_id: AccountId,
    token_class_id: String,
}

// Helper to log NEP-297 events
fn log_nep297_event<T: Serialize>(event_name: &str, data: T) {
    match serde_json::to_value(&data) {
        Ok(value) => {
            let event_log = Nep297Event {
                standard: "nep297", // Should match the specific SFT event standard if one emerges, else use nep297 as generic
                version: "1.0.0",
                event: event_name,
                data: vec![value],
            };
            match serde_json::to_string(&event_log) {
                Ok(json_string) => env::log_str(&format!("EVENT_JSON:{}", json_string)),
                Err(e) => log!("Failed to serialize NEP-297 event log: {}", e),
            }
        },
        Err(e) => log!("Failed to serialize NEP-297 event data: {}", e),
    }
}

// Storage Keys Enum
#[derive(BorshSerialize, BorshStorageKey)]
enum StorageKey {
    TokenMetadata,
    TokenSupply,
    OwnerBalances,
    TokenClasses,
    Approvals,
    CreatorMap,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub owner_id: AccountId,
    // Maps Token Class ID (e.g., "city-song-edition") -> Metadata
    pub token_metadata: LookupMap<String, NFTMetadata>,
    // Maps Token Class ID -> Total Supply as u64
    pub token_supply: LookupMap<String, u64>,
    // Maps Owner Account ID -> (Map of Token Class ID -> Balance as u64)
    pub owner_balances: LookupMap<AccountId, HashMap<String, u64>>,
    // Set to track all existing token class IDs
    pub token_classes: UnorderedSet<String>,
    // Map for approvals: Owner -> TokenClass -> ApprovedAccount -> Amount
    pub approvals: LookupMap<AccountId, HashMap<String, HashMap<AccountId, u64>>>,
    // Maps Token Class ID -> Creator Account ID
    pub creators: LookupMap<String, AccountId>,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            owner_id,
            token_metadata: LookupMap::new(StorageKey::TokenMetadata),
            token_supply: LookupMap::new(StorageKey::TokenSupply),
            owner_balances: LookupMap::new(StorageKey::OwnerBalances),
            token_classes: UnorderedSet::new(StorageKey::TokenClasses),
            approvals: LookupMap::new(StorageKey::Approvals),
            creators: LookupMap::new(StorageKey::CreatorMap),
        }
    }

    /// Mints new SFT copies for a given token class ID.
    /// If the token class ID doesn't exist, metadata must be provided to create it.
    /// Only the contract owner can call this.
    /// Requires deposit to cover storage costs.
    #[payable]
    pub fn sft_mint(&mut self, args: SftMintArgs) {
        // Validate input parameters
        assert!(!args.token_class_id.is_empty(), "Token class ID cannot be empty");
        assert!(args.amount.0 > 0, "Mint amount must be positive");
        
        // 1. Check Caller Permissions - REMOVED to allow public minting
        // assert_eq!(
        //     env::predecessor_account_id(),
        //     self.owner_id,
        //     "Only contract owner can mint tokens"
        // );

        let mint_amount: u64 = args.amount.0;

        // Measure initial storage usage
        let initial_storage_usage = env::storage_usage();
        
        // 3. Process metadata argument & check existence
        let class_exists = self.token_metadata.contains_key(&args.token_class_id);

        if let Some(meta) = args.metadata {
            // If metadata is provided, the class should NOT exist
            assert!(!class_exists, "Token class ID already exists, cannot provide metadata");
            // Store the new metadata
            self.token_metadata.insert(args.token_class_id.clone(), meta);
            // Initialize total supply
            self.token_supply.insert(args.token_class_id.clone(), 0);
            // Add the new class ID to our set
            self.token_classes.insert(args.token_class_id.clone());
            
            // --- Store the creator --- 
            let creator_id = env::predecessor_account_id();
            self.creators.insert(args.token_class_id.clone(), creator_id.clone());
            log!("Created new token class: {} by {}", args.token_class_id, creator_id);
            // --- End Store Creator --- 

        } else {
            // If metadata is not provided, the class MUST exist
            assert!(class_exists, "Token class ID does not exist, metadata must be provided for first mint");
        }

        // 4. Update Total Supply
        let current_supply = self.token_supply.get(&args.token_class_id).copied().unwrap_or(0);
        let new_supply = current_supply.checked_add(mint_amount)
            .expect("Total supply overflow");
        self.token_supply.insert(args.token_class_id.clone(), new_supply);

        // 5. Update Receiver Balance using standard HashMap
        let mut receiver_balances = self.owner_balances.remove(&args.receiver_id)
            .unwrap_or_else(HashMap::new);
        
        // Update the balance for this specific token class
        let current_balance = receiver_balances.entry(args.token_class_id.clone()).or_insert(0);
        *current_balance = current_balance.checked_add(mint_amount)
            .expect("Balance overflow");

        // Insert the updated HashMap back into the LookupMap
        self.owner_balances.insert(args.receiver_id.clone(), receiver_balances);

        // 2. Handle Storage Deposit & Refund
        let final_storage_usage = env::storage_usage();
        let storage_used = if final_storage_usage >= initial_storage_usage {
            final_storage_usage - initial_storage_usage
        } else {
            log!("Storage usage decreased unexpectedly!"); // Log potential issue
            0
        };
        
        let required_deposit = NearToken::from_yoctonear(u128::from(storage_used) * env::storage_byte_cost().as_yoctonear());
        let attached_deposit = env::attached_deposit();
        
        if attached_deposit < required_deposit {
            env::panic_str(&format!(
                "Insufficient deposit for storage. Attached: {}, Required: {}",
                attached_deposit, required_deposit
            ));
        }

        let refund = attached_deposit.saturating_sub(required_deposit);
        if refund.as_yoctonear() > 1 { // Don't refund dust
            Promise::new(env::predecessor_account_id()).transfer(refund);
        }

        log!(
            "Minted {} copies of token class {} for {}",
            mint_amount,
            args.token_class_id,
            args.receiver_id
        );
    }

    // --- View functions --- 
    // Get total supply for a token class
    pub fn sft_total_supply(&self, token_class_id: String) -> U64 {
        U64(self.token_supply.get(&token_class_id).copied().unwrap_or(0))
    }

    // Get balance for an owner and token class
    pub fn sft_balance_of(&self, account_id: AccountId, token_class_id: String) -> U64 {
        self.owner_balances.get(&account_id)
            .and_then(|balances| balances.get(&token_class_id).copied()) // Get balance from HashMap
            .map(U64)
            .unwrap_or_else(|| U64(0))
    }

     // Get metadata for a token class
    pub fn sft_metadata(&self, token_class_id: String) -> Option<NFTMetadata> {
        self.token_metadata.get(&token_class_id).cloned()
    }

    // Updated to return creator_id and handle missing creators gracefully
    pub fn sft_get_all_metadata(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<TokenClassMetadata> {
        let start_index = from_index.unwrap_or(0);
        let limit = limit.unwrap_or_else(|| self.token_classes.len() as u64);

        self.token_classes
            .iter()
            .skip(start_index as usize)
            .take(limit as usize)
            .filter_map(|token_class_id| {
                // Use filter_map based on creator existence
                self.creators.get(token_class_id.as_str()).and_then(|creator_id| {
                    // If creator exists, then get metadata
                    self.token_metadata.get(token_class_id.as_str()).map(|metadata| {
                        // Construct the result including the creator ID
                        TokenClassMetadata {
                            token_class_id: token_class_id.clone(),
                            metadata: metadata.clone(),
                            creator_id: creator_id.clone(),
                        }
                    })
                })
                // If creator or metadata is None for a class_id, it will be filtered out
            })
            .collect()
    }

    /// Returns the SFT inventory for a given owner.
    /// Key: Token Class ID, Value: Balance (U64)
    pub fn sft_inventory_of_owner(&self, account_id: AccountId) -> HashMap<String, U64> {
        self.owner_balances.get(&account_id)
            .map(|balances_map| {
                // Convert the inner HashMap<String, u64> to HashMap<String, U64>
                balances_map.iter()
                    .map(|(class_id, balance)| (class_id.clone(), U64(*balance)))
                    .collect()
            })
            .unwrap_or_else(HashMap::new) // Return empty map if owner not found
    }

    // --- Transfer and Approval Logic --- 

    // Internal helper for balance updates
    fn internal_transfer(
        &mut self,
        sender_id: &AccountId,
        receiver_id: &AccountId,
        token_class_id: &str,
        amount: u64,
    ) {
        // Get sender's balances, panic if sender doesn't exist (shouldn't happen if balance > 0)
        let mut sender_balances = self.owner_balances.remove(sender_id)
            .expect("Sender not found in owner_balances");
        
        // Get sender's balance for this token class, panic if insufficient
        let sender_balance = sender_balances.get_mut(token_class_id)
            .expect("Sender does not own this token class");
        
        assert!(*sender_balance >= amount, "Insufficient balance for transfer");
        *sender_balance -= amount;

        // If balance becomes zero, remove the entry for this token class
        let sender_balance_after = *sender_balance;
        if sender_balance_after == 0 {
            sender_balances.remove(token_class_id);
        }

        // If the sender's balance map is now empty, do not re-insert
        if !sender_balances.is_empty() {
            // Re-insert the modified sender's balance map (no clone needed, it's owned)
            self.owner_balances.insert(sender_id.clone(), sender_balances);
        }

        // Update receiver's balances (already uses remove/insert correctly)
        let mut receiver_balances = self.owner_balances.remove(receiver_id)
            .unwrap_or_else(HashMap::new);
        
        let receiver_balance = receiver_balances.entry(token_class_id.to_string()).or_insert(0);
        *receiver_balance = receiver_balance.checked_add(amount)
            .expect("Receiver balance overflow");
        
        // Insert the updated receiver balances back into the LookupMap (no clone needed)
        self.owner_balances.insert(receiver_id.clone(), receiver_balances);
    }

    /// Transfers SFT copies from the predecessor account to a receiver.
    /// Requires exactly 1 yoctoNEAR attached for security.
    #[payable]
    pub fn sft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_class_id: String,
        amount: U64,
        memo: Option<String>
    ) {
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            1,
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        let sender_id = env::predecessor_account_id();
        let amount: u64 = amount.0;

        assert!(amount > 0, "Transfer amount must be positive");
        assert_ne!(sender_id, receiver_id, "Sender and receiver cannot be the same");

        self.internal_transfer(&sender_id, &receiver_id, &token_class_id, amount);

        // Log NEP-297 event
        log_nep297_event(
            "sft_transfer", 
            SftTransferLogData {
                owner_id: sender_id, // Sender is the owner in this case
                receiver_id, 
                token_class_id, 
                amount: U64(amount), 
                memo, 
                authorized_id: None 
            }
        );
    }

    /// Approves an account to transfer specific SFT copies on behalf of the owner.
    #[payable]
    pub fn sft_approve(
        &mut self,
        account_id_to_approve: AccountId,
        token_class_id: String,
        amount: U64
    ) {
        let owner_id = env::predecessor_account_id();
        let approval_amount: u64 = amount.0; // Use a different name to avoid shadowing

        assert_ne!(owner_id, account_id_to_approve, "Owner cannot approve themselves");

        // Measure initial storage
        let initial_storage_usage = env::storage_usage();

        // Get or create the owner's approval map
        let mut owner_approvals = self.approvals.remove(&owner_id)
            .unwrap_or_else(HashMap::new);
        
        // Get or create the token class map within the owner's map
        let class_approvals = owner_approvals.entry(token_class_id.clone()).or_insert_with(HashMap::new);
        
        // Insert or update the approval for the specific account and amount
        class_approvals.insert(account_id_to_approve.clone(), approval_amount);

        // Re-insert the updated owner approvals map
        self.approvals.insert(owner_id.clone(), owner_approvals);

        // Handle storage deposit refund
        let final_storage_usage = env::storage_usage();
        let storage_used = if final_storage_usage >= initial_storage_usage {
            final_storage_usage - initial_storage_usage
        } else {
            // This case might happen if an existing approval for 0 is overwritten
            // or if storage usage calculation has quirks. We assume 0 cost if usage decreases.
            0 
        };

        let required_deposit = NearToken::from_yoctonear(u128::from(storage_used) * env::storage_byte_cost().as_yoctonear());
        let attached_deposit = env::attached_deposit();

        // Refund only if attached deposit is greater than required deposit
        // Allows attaching 0 if no new storage is needed (e.g., updating existing approval)
        if attached_deposit > required_deposit {
            let refund = attached_deposit.saturating_sub(required_deposit);
            if refund.as_yoctonear() > 1 { // Don't refund dust
                Promise::new(owner_id.clone()).transfer(refund);
            }
        } else if attached_deposit < required_deposit {
            // Panic if attached deposit is less than required, unless required is 0
            if required_deposit.as_yoctonear() > 0 {
                 env::panic_str(&format!(
                    "Insufficient deposit for storage. Attached: {}, Required: {}",
                    attached_deposit, required_deposit
                ));
            }
        }
        // If attached_deposit == required_deposit, do nothing (no refund needed)

        // Log NEP-297 event
         log_nep297_event(
            "sft_approve",
            SftApproveLogData {
                owner_id, 
                approved_account_id: account_id_to_approve, 
                token_class_id, 
                amount: U64(approval_amount)
            }
        );
    }

    /// Revokes an approval for a specific account and token class.
    #[payable]
    pub fn sft_revoke(
        &mut self,
        account_id_to_revoke: AccountId,
        token_class_id: String
    ) {
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            1,
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        let owner_id = env::predecessor_account_id();
        let mut revoked_event_fired = false; 

        // Use remove/insert pattern for mutability
        if let Some(mut owner_approvals) = self.approvals.remove(&owner_id) {
            // Mutably access class approvals within the owned owner_approvals
             if let Some(class_approvals) = owner_approvals.get_mut(&token_class_id) {
                // Remove the specific account being revoked
                if class_approvals.remove(&account_id_to_revoke).is_some() {
                    revoked_event_fired = true;
                     // If the class map is now empty, remove it from the owner's map
                    if class_approvals.is_empty() {
                        owner_approvals.remove(&token_class_id);
                    }
                    // Note: No need to re-insert class_approvals explicitly as we modified it via get_mut
                }
            }
            // If the owner's map is now empty, don't re-insert it
            if !owner_approvals.is_empty() {
                // Re-insert the potentially modified owner approvals map
                self.approvals.insert(owner_id.clone(), owner_approvals);
            }

            if revoked_event_fired {
                 // Log NEP-297 event only if something was actually revoked
                 log_nep297_event(
                     "sft_revoke",
                     SftRevokeLogData {
                         owner_id: owner_id.clone(), 
                         revoked_account_id: account_id_to_revoke.clone(), 
                         token_class_id: token_class_id.clone()
                     }
                 );
            }
        } 
        // If owner_id not found in self.approvals, do nothing.
    }

    /// Checks the approved amount for a specific account and token class.
    pub fn sft_is_approved(
        &self,
        owner_id: AccountId,
        approved_account_id: AccountId,
        token_class_id: String
    ) -> U64 {
        self.approvals.get(&owner_id)
            .and_then(|owner_approvals| owner_approvals.get(&token_class_id))
            .and_then(|class_approvals| class_approvals.get(&approved_account_id).copied())
            .map(U64)
            .unwrap_or_else(|| U64(0))
    }

    /// Returns a map of sellers who have approved the marketplace contract for a given token class
    /// among a provided list of potential sellers.
    /// Key: Seller Account ID, Value: Approved amount (U64)
    pub fn get_market_approved_sellers(&self, token_class_id: String, seller_ids: Vec<AccountId>) -> HashMap<AccountId, U64> {
        let marketplace_id = env::current_account_id();
        let mut approved_sellers = HashMap::new();

        // Iterate through provided seller IDs
        for owner_id in seller_ids {
            // Get the owner's full approval map
            if let Some(owner_approvals) = self.approvals.get(&owner_id) { 
                // Check for the specific token class
                if let Some(class_approvals) = owner_approvals.get(&token_class_id) {
                    // Check if the marketplace is approved
                    if let Some(approved_amount) = class_approvals.get(&marketplace_id).copied() {
                        if approved_amount > 0 {
                             approved_sellers.insert(owner_id.clone(), U64(approved_amount));
                        }
                    }
                }
            }
        }
        approved_sellers
    }

    /// Transfers SFT copies from a specified owner account by an approved account (predecessor).
    /// Requires exactly 1 yoctoNEAR attached for security.
    #[payable]
    pub fn sft_transfer_from(
        &mut self,
        owner_id: AccountId,
        receiver_id: AccountId,
        token_class_id: String,
        amount: U64,
        memo: Option<String>
    ) {
        assert_eq!(
            env::attached_deposit().as_yoctonear(),
            1,
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
        let approved_sender_id = env::predecessor_account_id();
        let transfer_amount: u64 = amount.0; // Use different name

        assert!(transfer_amount > 0, "Transfer amount must be positive");
        assert_ne!(owner_id, receiver_id, "Owner and receiver cannot be the same");
        assert_ne!(approved_sender_id, receiver_id, "Approved sender and receiver cannot be the same");
        assert_ne!(owner_id, approved_sender_id, "Owner cannot transfer from themselves using this method");

        // Use remove/insert pattern for mutability
        let mut owner_approvals = self.approvals.remove(&owner_id)
            .expect("Owner has no approvals");

        // Get the class-specific approvals map mutably
        let class_approvals = owner_approvals.get_mut(&token_class_id)
             .expect("Owner has no approvals for this token class");
        
        // Get the approved amount for the predecessor mutably
        let approved_amount = class_approvals.get_mut(&approved_sender_id)
            .expect("Predecessor account is not approved for this token class");
        
        assert!(*approved_amount >= transfer_amount, "Approved amount is insufficient for this transfer");
        *approved_amount -= transfer_amount;
        let approved_amount_after = *approved_amount; // Capture value after borrow ends

        // If the approved amount becomes zero, remove the approval entry
        if approved_amount_after == 0 {
            class_approvals.remove(&approved_sender_id);
        }
        // Cleanup class map if empty
        let class_map_empty = class_approvals.is_empty();
        if class_map_empty {
             owner_approvals.remove(&token_class_id);
        }
        
        // Re-insert owner approvals map if not empty
        if !owner_approvals.is_empty() {
            self.approvals.insert(owner_id.clone(), owner_approvals);
        }

        // Perform the actual token transfer using the internal helper
        self.internal_transfer(&owner_id, &receiver_id, &token_class_id, transfer_amount);

        // Log NEP-297 event
        log_nep297_event(
            "sft_transfer", // Standard event name for transfers
            SftTransferLogData {
                owner_id: owner_id.clone(), 
                receiver_id: receiver_id.clone(), 
                token_class_id: token_class_id.clone(), 
                amount: U64(transfer_amount), 
                memo: memo.clone(), 
                authorized_id: Some(approved_sender_id) // Indicate who initiated the transfer
            }
        );
    }

    // --- Marketplace Logic --- 

    /// Allows a buyer (predecessor) to purchase 1 copy of an SFT from a specific seller.
    /// Requires seller to have approved the marketplace contract (`env::current_account_id()`).
    /// Requires buyer to attach enough NEAR to cover the price.
    #[payable]
    pub fn market_buy_sft(
        &mut self,
        token_class_id: String,
        seller_id: AccountId
    ) {
        let buyer_id = env::predecessor_account_id();
        let marketplace_id = env::current_account_id();
        let amount_to_buy: u64 = 1; // Hardcoded to buy 1 copy for now

        assert_ne!(buyer_id, seller_id, "Buyer and seller cannot be the same");

        // --- Get Metadata & Price ---
        let metadata = self.token_metadata.get(&token_class_id)
            .expect("Token class metadata not found");
        let price_per_copy = metadata.price_per_copy.0; // u128

        // --- Verify Deposit ---
        let attached_deposit = env::attached_deposit().as_yoctonear(); // u128
        if attached_deposit < price_per_copy {
            env::panic_str(&format!(
                "Insufficient deposit. Attached: {}, Required: {}", attached_deposit, price_per_copy
            ));
        }
        // assert!(attached_deposit >= price_per_copy, 
        //     &format!("Insufficient deposit. Attached: {}, Required: {}", attached_deposit, price_per_copy)
        // );

        // --- Verify & Decrement Approval ---
        // Get seller's approvals
        // Clone owner_approvals immediately after getting it
        let mut owner_approvals = self.approvals.get(&seller_id)
            .expect("Seller has no approvals recorded").clone();

        // Get class-specific approvals (mutable borrow needed for update)
        // No need to clone class_approvals here as it's removed from owner_approvals
        let mut class_approvals = owner_approvals.remove(&token_class_id)
             .expect("Seller has no approvals for this token class"); 

        // Get the marketplace's approved amount (mutable borrow needed for update)
        let approved_amount = class_approvals.get_mut(&marketplace_id)
            .expect("Marketplace contract is not approved by the seller for this token class");

        // assert!(*approved_amount >= amount_to_buy, 
        //     &format!("Seller has not approved enough copies for sale. Approved: {}, Required: {}", *approved_amount, amount_to_buy)
        // );
        if *approved_amount < amount_to_buy {
            env::panic_str(&format!(
                "Seller has not approved enough copies for sale. Approved: {}, Required: {}", *approved_amount, amount_to_buy
            ));
        }
        
        *approved_amount -= amount_to_buy;
        let approved_amount_after = *approved_amount; // Capture value after borrow

        // Cleanup approvals map if amount becomes 0
        if approved_amount_after == 0 {
            class_approvals.remove(&marketplace_id);
        }

        // Re-insert the modified approval maps (handling empty maps)
        if !class_approvals.is_empty() {
            owner_approvals.insert(token_class_id.clone(), class_approvals);
        }
        if owner_approvals.is_empty() {
            self.approvals.remove(&seller_id);
        } else {
            // owner_approvals is already owned (cloned earlier), no further clone needed
            self.approvals.insert(seller_id.clone(), owner_approvals);
        }

        // --- Transfer NEAR to Seller ---
        Promise::new(seller_id.clone()).transfer(NearToken::from_yoctonear(price_per_copy));

        // --- Transfer SFT Copy to Buyer ---
        self.internal_transfer(&seller_id, &buyer_id, &token_class_id, amount_to_buy);

        // --- Refund Excess Deposit ---
        let refund = attached_deposit.saturating_sub(price_per_copy);
        if refund > 0 { 
            Promise::new(buyer_id.clone()).transfer(NearToken::from_yoctonear(refund)); 
        }

        // --- Logging ---
        // Reuse sft_transfer event, indicating marketplace involvement via authorized_id
        log_nep297_event(
            "sft_transfer",
            SftTransferLogData {
                owner_id: seller_id, // The original owner
                receiver_id: buyer_id, // The buyer
                token_class_id, 
                amount: U64(amount_to_buy), 
                memo: Some("Marketplace purchase".to_string()), 
                authorized_id: Some(marketplace_id) // Indicates marketplace facilitated
            }
        );
    }

    // --- Old functions (Commented out or removed as they are incompatible) --- 
    /*
    pub fn mint_nft(...)
    pub fn buy_nft(...)
    pub fn get_token(...)
    pub fn get_token_metadata(...)
    pub fn get_all_tokens(...)
    pub fn get_total_tokens(...)
    pub fn add(...)
    */
}

// --- Old tests removed --- 
/*
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
*/
