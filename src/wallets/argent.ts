import { Wallet, WalletType } from '../interfaces'
import { utils } from 'ethers';
import { Web3Provider } from 'ethers/providers/web3-provider'
import { Contract } from 'ethers/contract'

const argentABI = [
    'function isValidSignature(bytes32 _message, bytes _signature) public view returns (bool)',
    'function approveTokenAndCallContract(address _wallet, address _token, address _contract, uint256 _amount, bytes _data) external'
];

export class Argent implements Wallet {

    provider: Web3Provider
    contract: Contract
    type: WalletType
    address: string
    supportEIP1271: boolean
    supportApproveAndCall: boolean

    constructor(address: string, provider: Web3Provider) {
        this.type = WalletType.Argent
        this.provider = provider;
        this.supportEIP1271 = true
        this.supportApproveAndCall = true
        if (!utils.getAddress(address)) {
            throw new Error('Invalid signer address')
        }
        this.address = address
    }

    getName(): string {
        return 'Argent'
    }

    async getWalletContract(): Promise<Contract> {
        if (this.contract) return this.contract

        const signer = await this.provider.getSigner(0)
        this.contract = new Contract(this.address, argentABI, signer)
        return this.contract
    }

    async isWallet(codeSignature: string): Promise<boolean> {
        let success = false
        if (codeSignature === '0x83baa4b2') {
            const impl = await this.provider.getStorageAt(this.address, 0)
            success = ['0xb1dd690cc9af7bb1a906a9b5a94f94191cc553ce'].includes(utils.hexDataSlice(impl, 12))
        }
        return Promise.resolve(success)
    }

    async isValidSignature(message: string, signature: string): Promise<boolean> {
        const hexArray = utils.arrayify(message)
        const hashMessage = utils.hashMessage(hexArray)
        try {
            const walletContract = await this.getWalletContract()
            const returnValue = await walletContract.isValidSignature(hashMessage, signature)
            return Promise.resolve(returnValue)
        } catch (err) {
            return Promise.resolve(false)
        }
    }

    async approveAndCall(token: string, amount: number, contract: string, data: string): Promise<string> {
        const walletContract = await this.getWalletContract()
        const tx = await walletContract.approveTokenAndCallContract(this.address, token, contract, amount, data)
        return Promise.resolve(tx.hash)
    }
}