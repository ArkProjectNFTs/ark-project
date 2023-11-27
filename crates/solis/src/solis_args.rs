use clap::Args;

#[derive(Debug, Args, Clone)]
pub struct SolisOptions {
    #[arg(short, long)]
    #[arg(help = "Orderbook address (deployed on Solis).")]
    pub orderbook_address: String,
}
