import React from "react";

import { useConnect } from "@starknet-react/core";
import Image from "next/image";

import { Button } from "@/components/ui/Button";

function ConnectWallet() {
  const { connectors, connect } = useConnect();
  return (
    <div className="inline-flex flex-row gap-2 items-center justify-center">
      {connectors.map((connector) => {
        return (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            className="gap-x-2"
          >
            {connector.id}
          </Button>
        );
      })}
    </div>
  );
}

const Authentification = () => {
  return (
    <>
      <div className="md:hidden">
        <Image
          src="/authentication-dark.png"
          width={1280}
          height={843}
          alt="Authentication"
          className="block"
        />
      </div>
      <div className="container relative hidden h-[800px] flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r ">
          <div className="absolute inset-0 bg-zinc-900 bg-[url('/login.png')] bg-no-repeat bg-[length:auto_500px] bg-left" />
          <div className="relative z-20 flex space-x-4 items-center text-lg font-medium">
            <svg width="30" height="24" viewBox="0 0 30 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M29.624 12.7743C28.3051 18.7768 22.1068 24.2072 14.2251 23.4768C4.26939 22.5542 -0.857532 13.8757 0.11751 8.27101C1.09255 2.66636 8.4189 -0.442752 17.6794 1.30555C26.9399 3.05382 30.5121 7.51148 29.624 12.7743ZM14.6863 9.88504C14.5521 9.75398 14.3881 9.66795 14.2044 9.64471C13.6468 9.57415 13.1198 10.1094 13.0273 10.8402C12.9349 11.571 13.3119 12.2206 13.8696 12.2912C13.9865 12.306 14.1021 12.2941 14.2126 12.2594C13.6144 13.3254 12.5748 13.9386 11.5838 13.7019C10.3117 13.3979 9.60134 11.8082 9.99726 10.1512C10.3932 8.49416 11.7454 7.39728 13.0175 7.70123C13.9286 7.91891 14.5515 8.79602 14.6863 9.88504ZM24.3763 11.1009C24.7135 11.148 25.0105 11.3131 25.244 11.5582C25.0321 10.0808 24.1618 8.89962 22.909 8.612C21.1446 8.2069 19.2897 9.72787 18.7659 12.0092C18.2421 14.2905 19.2479 16.4683 21.0123 16.8734C22.3156 17.1726 23.6683 16.4209 24.4974 15.0882C24.2784 15.1672 24.0451 15.1953 23.8086 15.1623C22.8848 15.0332 22.2631 14.0193 22.4199 12.8978C22.5766 11.7763 23.4525 10.9718 24.3763 11.1009Z"
                fill="#5CABE2"
              />
            </svg>
            <div>ArkProject SDK</div>
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">
                &ldquo;This SDK integrates the Ark Project core library for
                efficient ArkProject transactions on ArkChain, enabling React
                developers to access core functionalities with ease.&rdquo;
              </p>
              <footer className="text-sm">Ark Project</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col items-center justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Connect your wallet
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a starknet wallet to start with
              </p>
              <ConnectWallet />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Authentification;
