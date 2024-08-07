pub mod erc2981;
pub mod interface;
pub mod fees;

pub use erc2981::ERC2981Component;
pub use interface::IERC2981Dispatcher;
pub use interface::IERC2981DispatcherTrait;
pub use interface::IERC2981SetupDispatcher;
pub use interface::IERC2981SetupDispatcherTrait;

pub use fees::FeesRatio;
pub use fees::FeesRatioDefault;
pub use fees::FeesImpl;

