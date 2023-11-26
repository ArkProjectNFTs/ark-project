mod common {
    mod setup;
    mod signer;
}

mod integration {
    mod test_create_listing_order;
    mod test_create_auction_offers;
    mod test_fulfill_listing;
    mod test_fulfill_auction;
    mod test_cancel_order;
}

mod unit {
    mod order {
        mod test_order_v1;
    }
    mod test_orderbook;
}

