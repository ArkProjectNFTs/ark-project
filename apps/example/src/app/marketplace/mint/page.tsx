"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useAccount,
  useContract,
  useContractRead,
  useContractWrite,
  useWaitForTransaction
} from "@starknet-react/core";
import { BigNumberish, toNumber } from "ethers";
import Image from "next/image";

import { useConfig } from "@ark-project/react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

import { ABI } from "./abi";

type TokenMetadata = {
  image: string;
  name: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
};

export default function Home() {
  const { address } = useAccount();
  const config = useConfig();
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(
    null
  );

  console.log(config?.starknetContracts.nftContract);
  const { contract } = useContract({
    abi: ABI,
    address: config?.starknetContracts.nftContract
  });
  const { data, isError, isLoading, error } = useContractRead({
    functionName: "get_current_token_id",
    abi: ABI,
    address: config?.starknetContracts.nftContract,
    watch: true
  });
  console.log(data);
  const calls = useMemo(() => {
    if (!address || !contract) return [];
    return contract.populateTransaction["mint"]!(
      address,
      `https://api.everai.xyz/m/${tokenId}`
    );
  }, [contract, address, tokenId]);

  const {
    writeAsync,
    data: writeData,
    isPending
  } = useContractWrite({
    calls
  });

  const { isLoading: transactionIsLoading } = useWaitForTransaction({
    hash: writeData?.transaction_hash,
    watch: true
  });

  const renderMedia = (url: string) => {
    const extension = url.split(".").pop();
    if (extension === "mp4") {
      return (
        <video width={350} height={350} autoPlay loop muted>
          <source src={url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <Image
          src={url}
          alt={tokenMetadata ? tokenMetadata.name : "Image"}
          width={350}
          height={350}
          layout="fixed"
        />
      );
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!isLoading && !isError && data !== null && data !== undefined) {
        let currentTokenId = toNumber(data as BigNumberish);
        setTokenId(currentTokenId);
        try {
          const response = await fetch(
            `https://api.everai.xyz/m/${currentTokenId}`
          );
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          const jsonData = await response.json();
          console.log(jsonData);
          setTokenMetadata(jsonData);
        } catch (error) {
          console.error("Fetch error:", error);
        }
      }
    };
    fetchData();
  }, [isError, isLoading, error, data]);

  return (
    <div className="hidden flex-col md:flex items-center">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Next Everai</CardTitle>
        </CardHeader>
        {tokenMetadata && (
          <CardContent className="grid gap-4">
            {renderMedia(tokenMetadata.image)}
            Current token ID: {tokenId}
          </CardContent>
        )}
        <CardFooter>
          {transactionIsLoading ? (
            <div>Transaction in progress</div>
          ) : (
            <Button onClick={() => writeAsync()}>
              {isPending ? "Minting..." : "Mint"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
