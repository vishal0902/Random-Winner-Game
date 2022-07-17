import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import Web3Modal from 'web3modal'
import React, { useEffect, useRef, useState } from 'react'
import {abi, RANDOM_WINNER_CONTRACT_ADDRESS} from '../constants'
import {BigNumber, utils, Contract, ethers, providers,} from 'ethers'
import  {FETCH_CREATED_GAME} from '../queries'
import {subgraphQuery} from '../utils'

export default function Home() {
  
  const zero = BigNumber.from("0");
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [entryFee, setEntryFee] = useState(zero);
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState();
  const [logs, setLogs] = useState([]);
  const web3ModalRef = useRef();

  const forceUpdate = React.useReducer(() => ({}), {})[1];

  const checkIfGameStarted = async () =>{
    try {
      const provider = await getProviderOrSigner();
      const randomGameContract = new Contract(
        RANDOM_WINNER_CONTRACT_ADDRESS,
        abi,
        provider
      );

      const _gameStarted = await randomGameContract.gameStarted();

      const gameData = await subgraphQuery(FETCH_CREATED_GAME());

      const _game = gameData.games[0];

      let _logs = [];
      console.log(_game.maxPlayers);
      console.log("hello"+_game.players.length);
      console.log(_game.entryFee);

      if(_gameStarted){
        _logs = [`Game started with the game ID:${_game.id}`];

        if(_game.players && _game.players.length > 0) {
          _logs.push(`${_game.players.length}/${_game.maxPlayers} alrady joined. `);
          _game.players.forEach(player => {
            _logs.push(`${player} joined.`);
          });
          setPlayers(_game.players);
        }

        setEntryFee(BigNumber.from(_game.entryFee));
        setMaxPlayers(_game.maxPlayers);
      
      } else if (!gameStarted && _game.winner) {
          _logs = [
            `Last game has ended with ID: ${_game.id}`,
            `Winner is: ${_game.winner} 🎉 `,
            `Waiting for host to start new game....`,
          ];
          console.log("oddd");
          setWinner(_game.winner);
        }
      setLogs(_logs);
      setGameStarted(_gameStarted);
      forceUpdate();

    } catch (err) {
      console.log(err);
    }
  }


  const joinGame = async() =>{
    try {
      const signer = await getProviderOrSigner(true);
      const randomGameContract = new Contract(
        RANDOM_WINNER_CONTRACT_ADDRESS,
        abi,
        signer
      );

      const txn = await randomGameContract.joinGame({
        value : entryFee
      });

      setLoading(true);
      await txn.wait();
      setLoading(false);

    } catch (err) {
      console.log(err);
    }
  }


  const startGame = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const randomGameContract = new Contract(
        RANDOM_WINNER_CONTRACT_ADDRESS,
        abi,
        signer
      );

      const tx = await randomGameContract.startGame(maxPlayers, entryFee);
      setLoading(true);
      await tx.wait();
      setLoading(false);

    } catch (err) {
      console.log(err);
    }
  }

  const getOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const randomGameContract = new Contract(
        RANDOM_WINNER_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const owner = await randomGameContract.owner();
      
      const address = await  signer.getAddress();
      
      if(address.toString() === owner.toString()){
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
      
    } catch (err) {
      console.log(err);
    }
  }

  const getProviderOrSigner = async (signerNeeded=false) => {
     try {
      const provider = await web3ModalRef.current.connect();
      const web3Provider = new providers.Web3Provider(provider);
      const { chainId } = await web3Provider.getNetwork();
      if(chainId !== 80001){
        window.alert("Switch your network to Mumbai Testnet.");
        throw new Error("Switch your network to Mumbai Testnet.");
      }
      if(signerNeeded){
        const signer = await web3Provider.getSigner();
        return signer;
      }
      return web3Provider;
     } catch (err) {
        console.log(err);
     }
  }

  const connectWallet = async () => {
     try {
        await getProviderOrSigner();
        setWalletConnected(true);
     } catch (error) {
      console.log(error);
     }
  }

  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "mumbai",
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet();
      getOwner();
      checkIfGameStarted();
      setInterval(() => {
        checkIfGameStarted();
      }, 2000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }
    if (gameStarted) {
      if (players.length === maxPlayers) {
        return (
          <button className={styles.button} disabled>
            Choosing winner...
          </button>
        );
      }
      return (
        <div>
          <button className={styles.button} onClick={joinGame}>
            Join Game 🚀
          </button>
        </div>
      );
    }
    if (isOwner && !gameStarted) {
      return (
        <div>
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setEntryFee(
                e.target.value >= 0
                  ? utils.parseEther(e.target.value.toString())
                  : zero
              );
            }}
            placeholder="Entry Fee (ETH)"
          />
          <input
            type="number"
            className={styles.input}
            onChange={(e) => {
              setMaxPlayers(e.target.value ?? 0);
            }}
            placeholder="Max players"
          />
          <button className={styles.button} onClick={startGame}>
            Start Game 🚀
          </button>
        </div>
      );
    }
    
  };

  return (
    <div>
      <Head>
        <title>LW3Punks</title>
        <meta name="description" content="LW3Punks-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Random Winner Game!</h1>
          <div className={styles.description}>
            Its a lottery game where a winner is chosen at random and wins the
            entire lottery pool
          </div>
          {renderButton()}
          {logs &&
            logs.map((log, index) => (
              <div className={styles.log} key={index}>
                {log}
              </div>
            ))}
        </div>
        <div>
          <img className={styles.image} src="./randomWinner.png" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Vishal 😎
      </footer>
    </div>
  );
}

