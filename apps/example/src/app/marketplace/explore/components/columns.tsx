"use client";

import { useAccount } from "@starknet-react/core";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { SiEthereum } from "react-icons/si";

import { areAddressesEqual, truncateString } from "@/lib/utils";

import { statuses } from "../data/data";
import { Token } from "../data/schema";
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
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Buy now" />
    ),
    cell: ({ row }) => {
      return (
        <div className="w-[100px] items-center flex">
          <span>0.99</span>
          <SiEthereum />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Sale" />
    ),
    cell: ({ row }) => {
      return (
        <div className="w-[100px] items-center flex">
          <span>0.92</span>
          <SiEthereum />
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
      return (
        <div className="w-[100px] items-center flex">
          <span>0.77</span>
          <SiEthereum />
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "listed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listed" />
    ),
    cell: ({ row }) => {
      return <div className="w-[100px] items-center">12m ago</div>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status")
      );

      if (!status) {
        return <div className="w-[80px]">-</div>;
      }

      return (
        <div className="w-[80px] items-center">
          {status.icon && (
            <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    }
  }
];
