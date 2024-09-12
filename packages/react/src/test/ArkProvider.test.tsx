import React from 'react';
import { render, screen, fireEvent} from '@testing-library/react';
import "@test"
import { ArkProvider} from '../components';
import {StarknetProvider} from "../test/mocks/starknet-provider";
import { describe } from 'test';
import { networks } from '@ark-project/core'
import { useAccount } from "@starknet-react/core";
//
import '@testing-library/jest-dom'
import { useCreateAuction } from '../hooks';

export function injectStarknetProvider(childrenComponent: React.ReactNode) {
    return (
        <StarknetProvider>
          {childrenComponent}
        </StarknetProvider>
      );
    }

describe('ArkProvider core component functioning', () => {
    test('should render children', () => {
    render(
    <StarknetProvider>
<ArkProvider config={{
    starknetNetwork: networks.testnet,
    ArkProvider: networks.testnet  
}}>
    <div>Hello World</div>
</ArkProvider>
</StarknetProvider>
);
const parentElement = screen.getByText('Hello World');
expect(parentElement).toBeTruthy(); 
});

function creationOfAuction(): React.ReactNode {
const { account,address } = useAccount();
const { create, status, response } = useCreateAuction();

const tokenAddress: string = "0x"
const tokenId: number = 1
const tokenAmount: number = 100

const handleCreateAuction = async () => {
    await create({
      starknetAccount: address,
      tokenAddress: tokenAddress,
      tokenId: tokenId,
      startAmount: tokenAmount,
    });
};

return (
    <>
      <button onClick={handleCreateAuction}>Create Listing</button>
      <div>Status: {status}</div>
      {response && <div>Response: {response.toString()}</div>}
    </>
);
}

test('it should fetch the rendered parameters from ArkProvider', async () => {
    const mockAccount = { account: 'mockAccount', address: 'mockAddress' };
    const mockCreate = jest.fn();
    const mockStatus = '';
    const mockResponse = '';

    jest.mock('@starknet-react/core', () => ({
        useAccount: jest.fn(() => mockAccount),
        useCreateAuction: jest.fn(() => ({ create: mockCreate, status: mockStatus, response: mockResponse })),
    }));
    render(creationOfAuction());
    
    // Simulate button click
    const button = screen.getByText('Create Listing');
    fireEvent.click(button);

    // Check if create function is called with correct parameters
    expect(mockCreate).toHaveBeenCalledWith({
        starknetAccount: mockAccount.address,
        tokenAddress: '0x',
        tokenId: 1,
        startAmount: 100,
    });
    expect(screen.getByText(`Status: ${mockStatus}`)).not.toBeInTheDocument();
    expect(screen.getByText(`Response: ${mockResponse.toString()}`)).toBeInTheDocument();
});
});