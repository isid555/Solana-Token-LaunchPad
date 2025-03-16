import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { MINT_SIZE, TOKEN_2022_PROGRAM_ID, createMintToInstruction, createAssociatedTokenAccountInstruction, getMintLen, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, TYPE_SIZE, LENGTH_SIZE, ExtensionType, mintTo, getOrCreateAssociatedTokenAccount, getAssociatedTokenAddressSync } from "@solana/spl-token"
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import {WalletDisconnectButton, WalletMultiButton} from "@solana/wallet-adapter-react-ui";


export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    async function createToken() {
        const mintKeypair = Keypair.generate();
        const metadata = {
            mint: mintKeypair.publicKey,
            name: document.getElementById("name").value ||  'LEO',
            symbol: document.getElementById("symbol").value || 'LEO',
            uri: document.getElementById("image").value || 'https://cdn.100xdevs.com/metadata.json',
            additionalMetadata: [],
        };

        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),
            createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                mint: mintKeypair.publicKey,
                metadata: mintKeypair.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                mintAuthority: wallet.publicKey,
                updateAuthority: wallet.publicKey,
            }),
        );

        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.partialSign(mintKeypair);

        await wallet.sendTransaction(transaction, connection);

        console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);
        const associatedToken = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
        );

        console.log(associatedToken.toBase58());

        const transaction2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                associatedToken,
                wallet.publicKey,
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID,
            ),
        );

        await wallet.sendTransaction(transaction2, connection);

        const supply = document.getElementById("supply").value ;

        const transaction3 = new Transaction().add(
            createMintToInstruction(mintKeypair.publicKey, associatedToken, wallet.publicKey , Math.max(supply,1000000000),  [], TOKEN_2022_PROGRAM_ID)
        );

        await wallet.sendTransaction(transaction3, connection);

        console.log("Minted!")
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            backgroundColor: '#121212',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            backgroundImage:  "url('https://i.pinimg.com/originals/26/b7/c6/26b7c65e04d7d6c373adff19abd73212.gif')",
            backgroundRepeat:"no-repeat",
            backgroundAttachment:"fixed",
            backgroundSize:'cover',
            backgroundPosition:'center',
            opacity:4
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                padding: 20,
            }}>
                <WalletMultiButton/>
                <WalletDisconnectButton/>
            </div>

            <h1
                style={{
                    background: "linear-gradient(90deg, purple,red, violet,orange, green)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "20px"
                }}
            >
                Solana Token Launchpad
            </h1>

            <input style={inputStyle} type='text' placeholder='Name' id='name'/>
            <input style={inputStyle} type='text' placeholder='Symbol' id='symbol'/>
            <input style={inputStyle} type='text' placeholder='Image URL' id='image'/>
            <input style={inputStyle} type='text' placeholder='Initial Supply' id='supply'/>
            <button onClick={createToken} style={buttonStyle}>Create a token</button>
        </div>
    );
}

const inputStyle = {
    width: '300px',
    padding: '10px',
    margin: '8px 0',
    borderRadius: '8px',
    border: '1px solid #ddd',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: 'rgba(119,8,45,0.7)',
    color: 'white'
};

const buttonStyle = {
    marginTop: '10px',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3d045d',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background 0.3s ease',

}