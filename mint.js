// Import ethers only
import { ethers, Contract } from 'ethers';

// Configuration
const NFT_CONTRACT_ADDRESS = "0x9DE12463c4c000d2c8fB3eeB9C5E85706412Cd98";
const REQUIRED_CHAIN_ID = "0xaa36a7"; // Sepolia

// Simplified ABI for NFT Drop claim
const NFT_ABI = [
    "function claim(address _receiver, uint256 _quantity, address _currency, uint256 _pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) public payable",
    "function balanceOf(address owner) public view returns (uint256)"
];

// HTML elements
const connectButton = document.getElementById('connectButton');
const mintButton = document.getElementById('mintButton');
const statusMessage = document.getElementById('statusMessage');
const goToDapp = document.getElementById('goToDapp');

let provider, signer, userAddress, nftContract;

// Check MetaMask
if (typeof window.ethereum === 'undefined') {
    statusMessage.textContent = "⚠️ Install MetaMask";
    connectButton.disabled = true;
} else {
    connectButton.addEventListener('click', connectWallet);
}

// Connect Wallet
async function connectWallet() {
    statusMessage.textContent = "🔄 Connecting...";
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        const currentChainIdHex = '0x' + network.chainId.toString(16);

        if (currentChainIdHex !== REQUIRED_CHAIN_ID) {
            alert("Switch to Sepolia network in MetaMask");
            statusMessage.textContent = "⚠️ Wrong network";
            return;
        }

        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length === 0) throw new Error("No accounts");

        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, signer);

        // Check if already has NFT
        try {
            const balance = await nftContract.balanceOf(userAddress);
            if (balance.gt(0)) {
                statusMessage.textContent = "✅ You already have a pass!";
                connectButton.style.display = 'none';
                goToDapp.style.display = 'block';
                return;
            }
        } catch (e) {
            console.warn("Balance check failed:", e);
        }

        statusMessage.textContent = `✅ Connected!`;
        connectButton.style.display = 'none';
        mintButton.style.display = 'block';
        mintButton.addEventListener('click', mintNft, { once: true });

    } catch (error) {
        console.error("Connection error:", error);
        statusMessage.textContent = "❌ Connection failed";
    }
}

// Mint NFT
async function mintNft() {
    if (!nftContract || !userAddress) {
        statusMessage.textContent = "❌ Connect wallet first";
        return;
    }

    statusMessage.textContent = "⏳ Minting...";
    mintButton.disabled = true;
    mintButton.textContent = "Minting...";

    try {
        const tx = await nftContract.claim(
            userAddress,
            1,
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            0,
            {
                proof: [],
                quantityLimitPerWallet: 0,
                pricePerToken: 0,
                currency: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            },
            "0x",
            { value: 0, gasLimit: 300000 }
        );

        statusMessage.textContent = "⏳ Confirming...";
        console.log("Tx:", tx.hash);
        
        await tx.wait();
        console.log("✅ Success!");

        statusMessage.textContent = "✅ SUCCESS! Pass minted! 🎉";
        mintButton.style.display = 'none';
        goToDapp.style.display = 'block';

    } catch (error) {
        console.error("Mint error:", error);
        
        let msg = "❌ Failed: ";
        const errMsg = error.message || "";
        
        if (errMsg.includes("rejected")) msg = "⚠️ Transaction cancelled";
        else if (errMsg.includes("insufficient")) msg = "❌ Need Sepolia ETH for gas";
        else if (errMsg.includes("exceeded") || errMsg.includes("claimed")) msg = "❌ Already claimed";
        else if (errMsg.includes("!Condition") || errMsg.includes("!Qty")) {
            msg = "❌ Not configured\n\nFix in thirdweb:\n1. Lazy mint NFTs\n2. Set claim conditions";
        }
        else msg += "Check thirdweb dashboard setup";
        
        statusMessage.textContent = msg;
        statusMessage.style.whiteSpace = "pre-line";
        mintButton.disabled = false;
        mintButton.textContent = "Mint Your Free Pass";
    }
}
