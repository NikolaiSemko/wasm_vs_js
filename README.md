# wasm_vs_js
An example of WebAssembly running on canvas and comparing performance with JS

cargo new wasm_vs_js
cd wasm_vs_js
rustup target add wasm32-unknown-unknown wasm-pack build --release --target web
