use wasm_bindgen::prelude::*;

// https://www.tkat0.dev/posts/how-to-create-a-react-app-with-rust-and-wasm/
// wasm(Rust) + React導入参考サイト

#[wasm_bindgen]
pub fn add(left: i32, right: i32) -> i32 {
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
