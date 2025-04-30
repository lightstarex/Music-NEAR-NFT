Deployment Steps

1. Install Rust  
   Run:  
   ```
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```  
    ([Install Rust - Rust Programming Language](https://www.rust-lang.org/tools/install?utm_source=chatgpt.com))

2. Add the WebAssembly target  
   Run:  
   ```
   rustup target add wasm32-unknown-unknown
   ```  
    ([wasm32-unknown-unknown - The rustc book - Learn Rust](https://doc.rust-lang.org/nightly/rustc/platform-support/wasm32-unknown-unknown.html?utm_source=chatgpt.com))

3. Install the NEAR CLI  
   Run:  
   ```
   npm install -g near-cli
   ```  
    ([near-cli - npm](https://www.npmjs.com/package/near-cli?utm_source=chatgpt.com))

4. Create or access a NEAR TestNet account  
   • Use the NEAR Wallet (https://wallet.testnet.near.org) to create a new `.testnet` account.  
   • Or import an existing TestNet account via:  
     ```
     near account import-account using-web-wallet --networkId testnet
     ```

5. Log in through the CLI  
   Run:  
   ```
   near login --networkId testnet
   ```

6. Build your contract  
   ```
   cd nft_contract
   cargo build --target wasm32-unknown-unknown --release
   ```  
   The compiled Wasm will be at  
   `./target/wasm32-unknown-unknown/release/nft_contract.wasm`

7. Deploy to a temporary dev account (New Method)
   First, create a funded development account using the faucet. Choose a unique name:
   ```
   near create-account YOUR_DEV_ACCOUNT_ID.testnet --useFaucet
   ```
   Replace `YOUR_DEV_ACCOUNT_ID.testnet` with a unique name (e.g., `dev-1678886400-youraccount.testnet`).
   Save this account ID.

   Then, deploy the contract to this new account:
   ```
   near deploy \
     --accountId YOUR_DEV_ACCOUNT_ID.testnet \
     --wasmFile ./target/wasm32-unknown-unknown/release/nft_contract.wasm
   ```

8. (Optional) Deploy to your own TestNet account
   ```
   near deploy \
     --accountId YOUR_MAIN_ACCOUNT_ID.testnet \
     --wasmFile ./target/wasm32-unknown-unknown/release/nft_contract.wasm
   ```

9. Initialize the contract
   Replace `YOUR_CONTRACT_ID` with the account ID you deployed to (either `YOUR_DEV_ACCOUNT_ID.testnet` or `YOUR_MAIN_ACCOUNT_ID.testnet`).
   Replace `YOUR_INITIALIZING_ACCOUNT_ID.testnet` with the account you want to use to pay for the initialization transaction (usually your main account).
   ```
   near call \
     YOUR_CONTRACT_ID \
     new '{"owner_id":"YOUR_MAIN_ACCOUNT_ID.testnet"}' \
     --accountId YOUR_INITIALIZING_ACCOUNT_ID.testnet
   ```
   This sets your main account as the contract's owner.