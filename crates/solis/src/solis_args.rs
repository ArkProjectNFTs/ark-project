use clap::Args;

#[derive(Debug, Args, Clone)]
pub struct SolisOptions {
    #[arg(short, long)]
    #[arg(help = "Orderbook address: The address of the orderbook contract (deployed on Solis).")]
    pub orderbook_address: String,

    #[arg(short, long)]
    #[arg(
        help = "Executor address: The address of the Ark executor contract (deployed on Starknet)."
    )]
    pub executor_address: String,
}
