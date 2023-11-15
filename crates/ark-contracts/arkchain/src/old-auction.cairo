fn old_auction() {
    let current_listing_orderhash = self.token_listings.read(token_hash);
    let current_listing_order_status = order_status_read(current_listing_orderhash);

    // if an order exist for that token hash process to cancellation flow
    if (current_listing_order_status.is_some()) {
        let current_listing_ordertype = order_type_read(current_listing_orderhash).unwrap();
        // unwrap the order status since we know it exists
        let current_listing_order_status = current_listing_order_status.unwrap();
        // if ordertype is listing and order status is open, we need to cancel it
        if (current_listing_ordertype == OrderType::Listing) {
            if (current_listing_order_status == OrderStatus::Fulfilled) {
                // if ordertype is listing and order status is fulfilled, we need to panic user cannot cancel fulfilled order and create a new order
                panic_with_felt252(orderbook_errors::ORDER_FULFILLED);
            } else if (current_listing_order_status == OrderStatus::Open) {
                // if ordertype is listing and order status is open, we need to cancel it
                order_status_write(current_listing_orderhash, OrderStatus::CancelledByNewOrder);
            }
        }
    }

    let (current_auction_orderhash, _, offer_count) = self.auctions.read(token_hash);
    let current_auction_order_status = order_status_read(
        current_listing_orderhash
    ); // if there is an auction order already, we need to cancel it
    if current_auction_orderhash.is_non_zero() {
        /// if ordertype is auction, order status is open and offer_count <= 0, we need to cancel it
        let current_auction_order_status = current_auction_order_status.unwrap();
        if (current_auction_order_status == OrderStatus::Fulfilled) {
            // if ordertype is auction and order status is fulfilled, we cannot cancel fulfilled order and create a new order
            panic_with_felt252(orderbook_errors::ORDER_FULFILLED);
        } else if (current_auction_order_status == OrderStatus::Open) {
            let (_, _, offer_count) = self.auctions.read(token_hash);
            // get previous order end date
            let previous_order: OrderV1 = order_read(current_auction_orderhash)
                .expect('Order must exist');
            if (previous_order.is_order_expired()) {
                /// if the auction has expired, we can cancel the auction
                order_status_write(current_auction_orderhash, OrderStatus::CancelledByNewOrder);
            } else if (offer_count <= 0) {
                /// if the auction has less than 1 offer, we can cancel the auction
                order_status_write(current_auction_orderhash, OrderStatus::CancelledByNewOrder);
            } else if (previous_order.offerer != order.offerer) {
                /// if the auction offerer is not the same as the previous auction offerer, we can cancel the auction
                order_status_write(current_auction_orderhash, OrderStatus::CancelledByNewOrder);
            } else {
                /// in the other case, we cannot cancel the auction
                panic_with_felt252(orderbook_errors::ORDER_NOT_CANCELLABLE);
            }
        }
    }
}
