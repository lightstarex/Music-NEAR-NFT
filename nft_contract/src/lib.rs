use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::json_types::{U128, U64};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, Balance, PanicOnDefault, Promise};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct NFTMetadata {
    pub title: String,
    pub description: String,
    pub media: String, // URL to the MP3 file
    pub media_hash: String,
    pub copies: u64,
    pub price: Balance,
    pub cover_photo: String,
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct Token {
    pub owner_id: AccountId,
    pub metadata: NFTMetadata,
    pub token_id: String,
}

// Add this struct for JSON serialization of Token
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct JsonToken {
    pub token_id: String,
    pub owner_id: AccountId,
    pub metadata: NFTMetadata,
}

impl From<Token> for JsonToken {
    fn from(token: Token) -> Self {
        JsonToken {
            token_id: token.token_id,
            owner_id: token.owner_id,
            metadata: token.metadata,
        }
    }
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct Contract {
    pub tokens: UnorderedMap<String, Token>,
    pub token_metadata: UnorderedMap<String, NFTMetadata>,
    pub owner_id: AccountId,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            tokens: UnorderedMap::new(b"t".to_vec()),
            token_metadata: UnorderedMap::new(b"m".to_vec()),
            owner_id,
        }
    }

    pub fn mint_nft(
        &mut self,
        token_id: String,
        metadata: NFTMetadata,
    ) {
        let initial_storage_usage = env::storage_usage();
        
        let token = Token {
            owner_id: env::predecessor_account_id(),
            metadata: metadata.clone(),
            token_id: token_id.clone(),
        };

        self.tokens.insert(&token_id, &token);
        self.token_metadata.insert(&token_id, &metadata);

        let required_storage_in_bytes = env::storage_usage() - initial_storage_usage;
        let attached_deposit = env::attached_deposit();
        
        if attached_deposit < required_storage_in_bytes as u128 * env::storage_byte_cost() {
            env::panic_str("Insufficient deposit for storage");
        }
    }

    pub fn buy_nft(&mut self, token_id: String) {
        let token = self.tokens.get(&token_id).expect("Token not found");
        let price = token.metadata.price;
        
        if env::attached_deposit() < price {
            env::panic_str("Insufficient deposit");
        }

        let buyer_id = env::predecessor_account_id();
        let previous_owner_id = token.owner_id.clone();
        let mut new_token = token;
        new_token.owner_id = buyer_id;
        
        self.tokens.insert(&token_id, &new_token);
        
        // Transfer the payment to the previous owner
        Promise::new(previous_owner_id).transfer(price);
    }

    pub fn get_token(&self, token_id: String) -> Option<JsonToken> {
        self.tokens.get(&token_id).map(JsonToken::from)
    }

    pub fn get_token_metadata(&self, token_id: String) -> Option<NFTMetadata> {
        self.token_metadata.get(&token_id)
    }

    // Added method to get all tokens with pagination
    pub fn get_all_tokens(&self, from_index: Option<U128>, limit: Option<U64>) -> Vec<JsonToken> {
        let start = u128::from(from_index.unwrap_or(U128(0)));
        let limit = u64::from(limit.unwrap_or(U64(50)));
        
        self.tokens
            .keys()
            .skip(start as usize)
            .take(limit as usize)
            .map(|token_id| {
                let token = self.tokens.get(&token_id).unwrap();
                JsonToken::from(token)
            })
            .collect()
    }

    // Added method to get total supply of tokens
    pub fn get_total_tokens(&self) -> U128 {
        U128(self.tokens.len() as u128)
    }
}

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
