"use client";

import { useAccount } from "@starknet-react/core";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { SiEthereum } from "react-icons/si";
import { Web3 } from "web3";

import { areAddressesEqual, timeSince, truncateString } from "@/lib/utils";

// import { statuses } from "../data/data";
import { Token } from "../../../../types/schema";
import { DataTableColumnHeader } from "./data-table-column-header";

export const columns: ColumnDef<Token>[] = [
  {
    accessorKey: "metadata",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Image"
        className="w-[40px]"
      />
    ),
    cell: ({ row }) => {
      const metadata = row.getValue("metadata") as Token["metadata"];
      const url = metadata?.normalized?.image;
      const imageUrl = url ? url.replace(/\.mp4$/, ".jpg") : "/missing.jpg";
      return (
        <div className="w-[40px]">
          <Image
            src={imageUrl}
            width="40"
            height="40"
            alt={metadata?.normalized?.name || "Missing"}
            className="rounded"
          />
        </div>
      );
    }
  },
  {
    accessorKey: "token_id",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Token ID"
        className="pl-1"
      />
    ),
    cell: ({ row }) => (
      <div className="w-[80px] pl-1">#{row.getValue("token_id")}</div>
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: "start_amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Buy now" />
    ),
    cell: ({ row }) => {
      if (
        row.getValue("start_amount") === undefined ||
        row.getValue("start_amount") === null
      ) {
        return <div className="w-[100px] items-center">-</div>;
      } else {
        const price = Web3.utils.fromWei(row.getValue("start_amount"), "ether");
        return (
          <div className="w-[100px] items-center flex">
            <span>{price}</span>
            <SiEthereum />
          </div>
        );
      }
    }
  },
  {
    accessorKey: "last_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Sale" />
    ),
    cell: ({ row }) => {
      // to do get last sell price when available in the API
      return (
        <div className="w-[100px] items-center flex">
          <span>-</span>
          {/* <span>0.77</span>
          <SiEthereum /> */}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "owner",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Owner" />
    ),
    cell: ({ row }) => {
      const { address } = useAccount();
      const tokenOwner = row.getValue("owner") as string;
      const owner =
        address && areAddressesEqual(tokenOwner, address)
          ? "You"
          : truncateString(tokenOwner, 8);
      return (
        <div className="w-[100px] items-center">{truncateString(owner, 8)}</div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "offer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Top bid" />
    ),
    cell: ({ row }) => {
      // to do get top bid when available in the API
      return (
        <div className="w-[100px] items-center flex">
          <span>-</span>
          {/* <span>0.77</span>
          <SiEthereum /> */}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "listed_timestamp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listed" />
    ),
    cell: ({ row }) => {
      const listedTimeStamp = row.getValue("listed_timestamp") as number;
      if (listedTimeStamp === undefined) {
        return <div className="w-[100px] items-center">-</div>;
      }
      return (
        <div className="w-[100px] items-center">
          {timeSince(listedTimeStamp)}
        </div>
      );
    }
  },
  {
    accessorKey: "is_listed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Is listed" />
    ),
    cell: ({ row }) => {
      return (
        <div className="w-[100px] items-center">
          {row.getValue("is_listed") ? "Listed" : "Unlisted"}
        </div>
      );
    },
    filterFn: (row) => {
      return row.getValue("is_listed");
    }
  }
];
