// Import necessary functions from installed Zama SDK packages
import { initSDK as initFhevm, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk';
// Import ethers - Parcel will find it in node_modules
import { ethers, Contract } from 'ethers';

// --- Global Variables ---
let fhevmInstance; // Zama SDK instance
let currentChatTarget = null; // Variable to store who we are chatting with

// --- Configuration ---
const NFT_CONTRACT_ADDRESS = "0x9DE12463c4c000d2c8fB3eeB9C5E85706412Cd98"; // Your NFT Contract Address
const REQUIRED_CHAIN_ID = "0xaa36a7"; // Sepolia Testnet Chain ID (11155111 in hex)

// --- HTML Elements ---
const connectButton = document.getElementById('connectButton');
const statusMessage = document.getElementById('statusMessage');
const connectionArea = document.getElementById('connectionArea');
const quizArea = document.getElementById('quizArea');
const heading = document.querySelector('#connectionArea h1');
const quizForm = document.getElementById('quizForm'); // Get the form element
const quizStatusMessage = document.getElementById('quizStatusMessage'); // Status for quiz form
const hubArea = document.getElementById('hubArea');
const hubStatusMessage = document.getElementById('hubStatusMessage');
const resultArea = document.getElementById('resultArea');
const resultUsernames = document.getElementById('resultUsernames');
const scoreDisplay = document.getElementById('scoreDisplay');
const backToHubButton = document.getElementById('backToHubButton'); // From Results
const chatNowButton = document.getElementById('chatNowButton'); // From Results
const compatibilityButtons = document.querySelectorAll('.compatibilityButton'); // From Hub
const chatArea = document.getElementById('chatArea'); // Chat screen
const chatPartnerName = document.getElementById('chatPartnerName');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const backToHubFromChatButton = document.getElementById('backToHubFromChatButton'); // From Chat

// --- Helper Function to Show Only One Section ---
function showSection(sectionToShow) {
    // Hide all main sections first
    if (connectionArea) connectionArea.style.display = 'none';
    if (quizArea) quizArea.style.display = 'none';
    if (hubArea) hubArea.style.display = 'none';
    if (resultArea) resultArea.style.display = 'none';
    if (chatArea) chatArea.style.display = 'none';

    // Show the requested section
    if (sectionToShow) {
        // Chat area uses flexbox for its internal layout
        sectionToShow.style.display = (sectionToShow === chatArea) ? 'flex' : 'block';
    } else {
        // Fallback to connection area if something goes wrong
        if (connectionArea) connectionArea.style.display = 'block';
    }
}


// --- Zama SDK Initialization ---
async function initializeFhevm() {
    console.log("Initializing FHEVM...");
    try {
        await initFhevm(); // Load the WASM modules
        console.log("FHEVM WASM loaded.");
        const config = { ...SepoliaConfig };
        if (typeof window.ethereum !== 'undefined') {
             config.network = window.ethereum;
             console.log("Using window.ethereum as network provider for Zama.");
        } else { console.warn("MetaMask not detected."); }
        fhevmInstance = await createInstance(config);
        console.log("FHEVM instance created successfully.");
        const testKeys = fhevmInstance.generateKeypair();
        console.log("Generated test FHE key pair successfully.");
        return true;
    } catch (error) {
        console.error("Error initializing FHEVM:", error);
        if (statusMessage) statusMessage.textContent = "Error initializing privacy features. Please refresh.";
         return false;
    }
}

// --- Core Functions ---

// Function to get ethers provider and signer (Ethers v5 SYNTAX)
async function getProviderAndSigner() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        console.error("MetaMask not available!");
        return null;
    }
    try {
        // Use ethers.providers.Web3Provider for v5
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
         if (accounts.length === 0) throw new Error("No accounts found/approved.");
        
        // Use provider.getSigner() for v5
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        const network = await provider.getNetwork();
        const currentChainIdHex = '0x' + network.chainId.toString(16);
         if (currentChainIdHex !== REQUIRED_CHAIN_ID) {
             alert(`Please switch MetaMask to the Sepolia network (Chain ID: ${REQUIRED_CHAIN_ID})`);
             return null;
         }
        console.log("Provider and signer obtained successfully.");
        return { provider, signer, userAddress };
    } catch (error) {
        console.error("Error getting provider/signer:", error);
        if (statusMessage) statusMessage.textContent = "Failed to connect wallet.";
        return null;
    }
}


// Function to check NFT ownership (Ethers v5 SYNTAX)
async function checkNFTOwnership(provider, walletAddress) {
    if (!provider) {
         console.error("Provider missing for NFT check"); return false;
    }
    const nftABI = [ "function balanceOf(address owner) view returns (uint256)" ];
    let nftContract;
     try { nftContract = new Contract(NFT_CONTRACT_ADDRESS, nftABI, provider); }
     catch (e) { console.error("Contract creation failed:", e); return false; }
    try {
        const balance = await nftContract.balanceOf(walletAddress);
        console.log(`NFT Balance for ${walletAddress}:`, balance.toString());
        const hasNFT = balance.gt(0); // Use .gt(0) for BigNumber in v5
        console.log("Does user have NFT?", hasNFT);
        return hasNFT;
    } catch (error) { console.error("Error calling balanceOf:", error); return false; }
}

// Function to handle wallet connection and NFT check
async function connectAndCheck() {
    console.log("Connect button clicked!");
    if(statusMessage) statusMessage.textContent = "Connecting...";
    if (!fhevmInstance) { 
        console.error("FHEVM not ready."); 
        if(statusMessage) statusMessage.textContent = "Init failed. Refresh."; 
        return; 
    }
    const walletInfo = await getProviderAndSigner();
    if (!walletInfo) return;
    const { provider, userAddress } = walletInfo;
    console.log("Connected account:", userAddress);
    if (connectButton) connectButton.textContent = 'Checking Membership...';
    if (heading) heading.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
    if (statusMessage) statusMessage.textContent = "Checking for Membership NFT...";
    const hasNFT = await checkNFTOwnership(provider, userAddress);
    if (hasNFT === true) {
        console.log("NFT check successful.");
        showSection(quizArea); // Show Quiz
    } else {
        console.log("NFT check unsuccessful.");
        if (hasNFT === false && statusMessage) statusMessage.textContent = "Membership NFT not found.";
        else if (statusMessage) statusMessage.textContent = statusMessage.textContent || "NFT check failed.";
        if (connectButton) connectButton.textContent = 'NFT Not Found / Error';
    }
}

// --- Function to Handle Quiz Submission (Simulated Encryption) ---
async function handleQuizSubmit(event) {
    event.preventDefault();
    console.log("Quiz submitted!");
    if(quizStatusMessage) quizStatusMessage.textContent = "Processing answers...";
    if (!fhevmInstance) { console.error("FHEVM not ready."); if(quizStatusMessage) quizStatusMessage.textContent = "Error: Refresh."; return; }
    const walletInfo = await getProviderAndSigner();
    if (!walletInfo) { if(quizStatusMessage) quizStatusMessage.textContent = "Wallet disconnected?"; return; }

    const answers = [];
    let allAnswered = true;
    for (let i = 1; i <= 5; i++) {
        const selectedAnswer = document.querySelector(`input[name="q${i}"]:checked`);
        if (selectedAnswer) answers.push(parseInt(selectedAnswer.value, 10));
        else { allAnswered = false; break; }
    }
    if (!allAnswered) { alert(`Please answer all questions.`); if(quizStatusMessage) quizStatusMessage.textContent = "Answer all questions."; return; }
    console.log("Selected answers (plaintext):", answers);

    try {
        if(quizStatusMessage) quizStatusMessage.textContent = "Simulating encryption...";
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        console.log("Encryption SIMULATED successfully.");
        showSection(hubArea); // Show Hub
    } catch (error) {
        console.error("Error during simulated submission:", error);
        if(quizStatusMessage) quizStatusMessage.textContent = "Processing failed.";
    }
}

// --- Functions for Hub/Result/Chat Interaction ---
function showResultScreen(targetUsername) {
    console.log("Checking compatibility with:", targetUsername);
    currentChatTarget = targetUsername;
    if(hubStatusMessage) hubStatusMessage.textContent = `Simulating check with ${targetUsername}...`;
    
    // Reset gauge fill to 0 before animating
    const gaugeFill = document.querySelector('.gauge-fill');
    if (gaugeFill) {
        gaugeFill.style.transition = 'none'; 
        gaugeFill.style.setProperty('--gauge-angle', `0deg`);
    }

    setTimeout(() => {
        const randomScore = Math.floor(Math.random() * 41) + 60; // 60-100%
        if (resultUsernames) resultUsernames.textContent = `You & ${targetUsername}`;
        if (scoreDisplay) scoreDisplay.textContent = `${randomScore}%`;

        if (gaugeFill) {
            const angle = (randomScore / 100) * 360; 
            setTimeout(() => { 
                gaugeFill.style.transition = 'all 0.8s ease-out';
                gaugeFill.style.setProperty('--gauge-angle', `${angle}deg`);
            }, 50); 
        }

        showSection(resultArea);
        if(hubStatusMessage) hubStatusMessage.textContent = "";
    }, 1500);
}

function showHubScreen() {
    showSection(hubArea);
    currentChatTarget = null;
}

function showChatScreen() {
    console.log("Showing chat screen for:", currentChatTarget);
    if (!currentChatTarget) { console.error("No chat target selected."); showHubScreen(); return; }
    if (chatPartnerName) chatPartnerName.textContent = `Chatting with ${currentChatTarget}`;
    if(chatHistory) chatHistory.innerHTML = '<div class="message received"><p>Hi there! Saw we matched. (Simulated)</p></div>';
    showSection(chatArea);
}

function handleSendMessage() {
    if (!chatInput || !chatHistory) return;
    const messageText = chatInput.value.trim();
    if (messageText === "") return;
    console.log("Sending message:", messageText);
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'sent');
    const messageP = document.createElement('p');
    messageP.textContent = messageText;
    messageDiv.appendChild(messageP);
    chatHistory.appendChild(messageDiv);
    chatInput.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    setTimeout(() => {
        const replyDiv = document.createElement('div');
        replyDiv.classList.add('message', 'received');
        const replyP = document.createElement('p');
        replyP.textContent = `Ok, cool! (Simulated reply)`;
        replyDiv.appendChild(replyP);
        chatHistory.appendChild(replyDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 1200);
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded.");
    showSection(connectionArea);

    const proceedWithInit = () => {
        initializeFhevm().then((initSuccess) => {
            console.log("FHEVM Initialization completed. Success:", initSuccess);
            if (connectButton) {
                connectButton.addEventListener('click', connectAndCheck);
                console.log("Event listener added to connect button.");
            } else { console.error("Connect Wallet button not found!"); }
            if (quizForm) {
                quizForm.addEventListener('submit', handleQuizSubmit);
                 console.log("Event listener added to quiz form.");
            } else { console.error("Quiz form not found!"); }
             if (compatibilityButtons) {
                 compatibilityButtons.forEach(button => {
                     button.addEventListener('click', (event) => {
                         const targetButton = event.target.closest('.compatibilityButton');
                         if (targetButton && targetButton.dataset.target) {
                             showResultScreen(targetButton.dataset.target);
                         } else { console.error("Could not find target on button", event.target); }
                     });
                 });
                 console.log("Event listeners added to compatibility buttons.");
             } else { console.error("Compatibility buttons not found!"); }
             if (backToHubButton) {
                 backToHubButton.addEventListener('click', showHubScreen);
                 console.log("Event listener added to Back button (Results).");
             } else { console.error("Back to Hub button (Results) not found!"); }
             if (chatNowButton) {
                 chatNowButton.addEventListener('click', showChatScreen);
                 console.log("Event listener added to Chat Now button.");
             } else { console.error("Chat Now button not found!"); }
             if (sendMessageButton) {
                 sendMessageButton.addEventListener('click', handleSendMessage);
                 if (chatInput) {
                     chatInput.addEventListener('keypress', function (e) {
                         if (e.key === 'Enter') {
                             e.preventDefault();
                             handleSendMessage();
                         }
                     });
                 }
                 console.log("Event listener added to Send Message button.");
             } else { console.error("Send Message button not found!"); }
              if (backToHubFromChatButton) {
                  backToHubFromChatButton.addEventListener('click', showHubScreen);
                  console.log("Event listener added to Back button (Chat).");
              } else { console.error("Back to Hub button (Chat) not found!"); }
            console.log("Script loaded and ready.");
        });
    };
    console.log("Ethers.js is imported. Proceeding with FHEVM init.");
    proceedWithInit();
});