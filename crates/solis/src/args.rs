use clap::{Args, Parser, Subcommand};
use clap_complete::Shell;
use katana_core::backend::config::{Environment, StarknetConfig};
use katana_core::constants::{
    DEFAULT_GAS_PRICE, DEFAULT_INVOKE_MAX_STEPS, DEFAULT_VALIDATE_MAX_STEPS,
};
use katana_core::sequencer::SequencerConfig;
use katana_rpc::api::ApiKind;
use katana_rpc::config::ServerConfig;
use tracing::Subscriber;
use tracing_subscriber::{fmt, EnvFilter};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
pub struct KatanaArgs {
    #[arg(short, long)]
    #[arg(value_name = "MILLISECONDS")]
    #[arg(help = "Block time in milliseconds for interval mining.")]
    pub block_time: Option<u64>,

    #[arg(long)]
    pub dev: bool,

    #[arg(long)]
    #[arg(value_name = "PATH")]
    #[arg(value_parser = katana_core::service::messaging::MessagingConfig::parse)]
    #[arg(help = "Configure the messaging with an other chain.")]
    #[arg(
        long_help = "Configure the messaging to allow Katana listening/sending messages on a \
                       settlement chain that can be Ethereum or an other Starknet sequencer. \
                       The configuration file details and examples can be found here: TODO."
    )]
    pub messaging: katana_core::service::messaging::MessagingConfig,

    // #[command(flatten)]
    // #[command(next_help_heading = "Solis options")]
    // pub solis: crate::solis_args::SolisOptions,
    #[command(flatten)]
    #[command(next_help_heading = "Server options")]
    pub server: ServerOptions,

    #[command(flatten)]
    #[command(next_help_heading = "Starknet options")]
    pub starknet: StarknetOptions,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Debug, Subcommand)]
pub enum Commands {
    #[command(about = "Generate shell completion file for specified shell")]
    Completions { shell: Shell },
}

#[derive(Debug, Args, Clone)]
pub struct ServerOptions {
    #[arg(short, long)]
    #[arg(default_value = "7777")]
    #[arg(help = "Port number to listen on.")]
    pub port: u16,

    #[arg(long)]
    #[arg(help = "The IP address the server will listen on.")]
    pub host: Option<String>,

    #[arg(long)]
    #[arg(default_value = "100")]
    #[arg(help = "Maximum number of concurrent connections allowed.")]
    pub max_connections: u32,
}

#[derive(Debug, Args, Clone)]
pub struct StarknetOptions {
    #[arg(long)]
    #[arg(default_value = "0")]
    #[arg(help = "Specify the seed for randomness of accounts to be predeployed.")]
    pub seed: String,

    #[arg(long = "accounts")]
    #[arg(value_name = "NUM")]
    #[arg(default_value = "2")]
    #[arg(help = "Number of pre-funded accounts to generate.")]
    pub total_accounts: u8,

    // Fees are disabled for now on Solis.
    // #[arg(long)]
    // #[arg(help = "Disable charging fee for transactions.")]
    // pub disable_fee: bool,
    #[command(flatten)]
    #[command(next_help_heading = "Environment options")]
    pub environment: EnvironmentOptions,
}

#[derive(Debug, Args, Clone)]
pub struct EnvironmentOptions {
    #[arg(long)]
    #[arg(help = "The chain ID.")]
    #[arg(default_value = "SOLIS")]
    pub chain_id: String,

    #[arg(long)]
    #[arg(help = "The gas price.")]
    pub gas_price: Option<u128>,

    #[arg(long)]
    #[arg(help = "The maximum number of steps available for the account validation logic.")]
    pub validate_max_steps: Option<u32>,

    #[arg(long)]
    #[arg(help = "The maximum number of steps available for the account execution logic.")]
    pub invoke_max_steps: Option<u32>,
}

impl KatanaArgs {
    pub fn init_logging(&self) -> Result<(), Box<dyn std::error::Error>> {
        const DEFAULT_LOG_FILTER: &str = "info,executor=trace,server=debug,katana_core=trace,\
                                          blockifier=off,jsonrpsee_server=off,hyper=off,\
                                          messaging=debug";

        let builder = fmt::Subscriber::builder().with_env_filter(
            EnvFilter::try_from_default_env().or(EnvFilter::try_new(DEFAULT_LOG_FILTER))?,
        );

        let subscriber: Box<dyn Subscriber + Send + Sync> = Box::new(builder.finish());

        Ok(tracing::subscriber::set_global_default(subscriber)?)
    }

    pub fn sequencer_config(&self) -> SequencerConfig {
        SequencerConfig {
            block_time: self.block_time,
            no_mining: false,
            messaging: Some(self.messaging.clone()),
        }
    }

    pub fn server_config(&self) -> ServerConfig {
        let mut apis = vec![ApiKind::Starknet];
        // only enable `katana` API in dev mode
        if self.dev {
            apis.push(ApiKind::Katana);
        }

        ServerConfig {
            apis,
            port: self.server.port,
            host: self.server.host.clone().unwrap_or("0.0.0.0".into()),
            max_connections: self.server.max_connections,
        }
    }

    pub fn starknet_config(&self) -> StarknetConfig {
        StarknetConfig {
            total_accounts: self.starknet.total_accounts,
            seed: parse_seed(&self.starknet.seed),
            disable_fee: true,
            disable_validate: false,
            fork_rpc_url: None,
            fork_block_number: None,
            env: Environment {
                chain_id: self.starknet.environment.chain_id.clone(),
                gas_price: self
                    .starknet
                    .environment
                    .gas_price
                    .unwrap_or(DEFAULT_GAS_PRICE),
                invoke_max_steps: self
                    .starknet
                    .environment
                    .invoke_max_steps
                    .unwrap_or(DEFAULT_INVOKE_MAX_STEPS),
                validate_max_steps: self
                    .starknet
                    .environment
                    .validate_max_steps
                    .unwrap_or(DEFAULT_VALIDATE_MAX_STEPS),
            },
        }
    }
}

fn parse_seed(seed: &str) -> [u8; 32] {
    let seed = seed.as_bytes();

    if seed.len() >= 32 {
        unsafe { *(seed[..32].as_ptr() as *const [u8; 32]) }
    } else {
        let mut actual_seed = [0u8; 32];
        seed.iter()
            .enumerate()
            .for_each(|(i, b)| actual_seed[i] = *b);
        actual_seed
    }
}
