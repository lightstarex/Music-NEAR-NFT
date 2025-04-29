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
    pub media: String,
    pub media_hash: [u8; 32],
    pub copies: u32,
    pub price: String,
    pub cover_photo: String,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Token {
    pub owner_id: AccountId,
    pub metadata: NFTMetadata,
    pub token_id: String,
}

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
    pub owner_id: AccountId,
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        Self {
            tokens: UnorderedMap::new(b"t"),
            owner_id,
        }
    }

    pub fn clear_state(&mut self) {
        assert_eq!(env::predecessor_account_id(), self.owner_id, "Only the owner can clear the state");
        self.tokens = UnorderedMap::new(b"t");
    }

    #[payable]
    pub fn mint_nft(
        &mut self,
        token_id: String,
        metadata: NFTMetadata,
    ) {
        assert_eq!(metadata.media_hash.len(), 32, "Media hash must be exactly 32 bytes");

        let initial_storage_usage = env::storage_usage();
        
        let token = Token {
            owner_id: env::predecessor_account_id(),
            metadata,
            token_id: token_id.clone(),
        };

        assert!(self.tokens.insert(&token_id, &token).is_none(), "Token already exists");

        let required_storage_in_bytes = env::storage_usage() - initial_storage_usage;
        let attached_deposit = env::attached_deposit();
        
        assert!(
            attached_deposit >= required_storage_in_bytes as u128 * env::storage_byte_cost(),
            "Insufficient deposit for storage"
        );
    }

    pub fn buy_nft(&mut self, token_id: String) {
        let token = self.tokens.get(&token_id).expect("Token not found");
        let price: Balance = token.metadata.price.parse().expect("Invalid price format");
        
        assert!(
            env::attached_deposit() >= price,
            "Insufficient deposit"
        );

        let buyer_id = env::predecessor_account_id();
        let previous_owner_id = token.owner_id.clone();
        let mut new_token = token;
        new_token.owner_id = buyer_id;
        
        self.tokens.insert(&token_id, &new_token);
        
        Promise::new(previous_owner_id).transfer(price);
    }

    pub fn get_token(&self, token_id: String) -> Option<JsonToken> {
        self.tokens.get(&token_id).map(JsonToken::from)
    }

    pub fn get_all_tokens(&self, from_index: Option<U128>, limit: Option<U64>) -> Vec<JsonToken> {
        let start = u128::from(from_index.unwrap_or(U128(0)));
        let limit = u64::from(limit.unwrap_or(U64(50)));
        
        self.tokens
            .keys()
            .skip(start as usize)
            .take(limit as usize)
            .filter_map(|token_id| self.tokens.get(&token_id).map(JsonToken::from))
            .collect()
    }

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
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::{testing_env, VMContext};

    fn get_context(is_view: bool) -> VMContext {
        VMContextBuilder::new()
            .signer_account_id("alice.near".parse().unwrap())
            .is_view(is_view)
            .build()
    }

    #[test]
    fn test_new() {
        let context = get_context(false);
        testing_env!(context);
        let contract = Contract::new("owner.near".parse().unwrap());
        assert_eq!(contract.get_total_tokens(), U128(0));
    }
}
