import React, { useEffect, useRef, useState } from "react";
import "./App.css";

import { BigNumber, Contract, ethers } from "ethers";
import BallotABI from "./contracts/Ballot.json";
import BallotAddr from "./contracts/contract-address.json";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Button, Modal, Popconfirm, Select, Table } from "antd";
import { getAddress } from "@ethersproject/address";
const { Option } = Select;
const HhLocal = "http://127.0.0.1:8545/";
const proposals = ["apple", "orange", "banana"];
interface Voter {
  weight: BigNumber;
  vote: BigNumber;
  voted: boolean;
  delegate: string;
  address: string;
}

interface Proposal {
  name: string;
  voteCount: BigNumber;
}

const isAddress0 = (i: string) =>
  i === "0x0000000000000000000000000000000000000000";

function App() {
  const ballot = useRef<Contract>();
  const provider = useRef<JsonRpcProvider>();
  const [voters, getVoters] = useState<Voter[]>([]);
  const [ps, getProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    _init();
    _getVoters();
    _getProposals();
  }, []);
  function _init() {
    provider.current = new ethers.providers.JsonRpcProvider(HhLocal);
    ballot.current = new ethers.Contract(
      BallotAddr.Token,
      BallotABI.abi,
      provider.current.getSigner(0)
    );
  }
  async function _getProposals() {
    
    if (!ballot.current) return

    const a = await ballot?.current?.proposals(0)
    const pmis = proposals.map(async (p, i) => {
      return await (ballot?.current?.proposals(i) as Proposal)
    })
    const list = await Promise.all(pmis)
    getProposals(proposals.map((_, index) => {
      return {
        name: proposals[index],
        voteCount: list[index].voteCount
      }
    }))
       
    
  }
  async function _getVoter(i: string): Promise<Voter> {
    const v: Voter = await ballot?.current?.voters(i);
    return v as Voter;
  }
  async function _getVoters() {
    if (!provider.current) return;
    const addrList = await provider.current.listAccounts();
    // const list: Voter[] = [];
    const pmis = addrList.map((i) => {
      return _getVoter(i)
        .then((v) => {
          return {
            address: i,
            vote: v.vote,
            voted: v.voted,
            delegate: v.delegate,
            weight: v.weight,
          } as Voter;
        })
        .catch(() => {
          return {
            address: i,
            vote: BigNumber.from(0),
            voted: false,
            delegate: "",
            weight: BigNumber.from(0),
          };
        });
    });
    const list: Voter[] = await Promise.all(pmis);
    getVoters(list);
    // console.log(list);
  }

  async function giveRightToVote(voter: Voter, index: number) {
    try {
      // const ye = await provider.current?.getBalance('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
      // console.log(ye?.toString())
      const tx = await ballot?.current?.giveRightToVote(voter.address, {
        gasLimit: BigNumber.from("30000000"),
      });
      const receipt = await tx.wait();
      if (receipt.status == 0) {
        return;
      }
      const v = voters[index];
      getVoters([
        ...voters.slice(0, index),
        { ...v, weight: BigNumber.from(1) },
        ...voters.slice(index + 1),
      ]);
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div className="App">
      <header>
        <a
          className="App-link"
          href="https://docs.soliditylang.org/en/v0.8.15/solidity-by-example.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          solidity-by-example
        </a>
      </header>
      <p style={{ textAlign: "left" }}>
        proposals:
      </p>
      {
        ps.map(i => {
          return <div className="flex">
          {`proposal ${i.name} has ${i.voteCount} of votes`}
        </div>
        })
      }
     
      <p style={{ textAlign: "left" }}>list of voters:</p>

      <Table
        pagination={false}
        dataSource={voters}
        columns={[
          { title: "num", render: (_, __, index) => index },
          { title: "address", dataIndex: "address" },
          {
            title: "weight",
            dataIndex: "weight",
            render: (i, voter, index) => {
              const w = i.toNumber();
              return (
                <Popconfirm
                  title="give right to vote?"
                  onConfirm={() => {
                    giveRightToVote(voter, index);
                  }}
                  // onCancel={}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button disabled={w}> {w ? w : "give right"} </Button>
                </Popconfirm>
              );
            },
          },
          {
            title: "voted",
            dataIndex: "voted",
            render: (i, v, index) => (
              <Button
                disabled={i || v.weight.toNumber() == 0}
                onClick={() => {
                  let selected = -1;
                  Modal.info({
                    title: "vote to proposal",
                    onOk: async () => {
                      if (selected === -1) return;
                      if (!ballot.current || !provider.current) return;
                      try {
                        const tx = ballot.current
                          .connect(provider.current.getSigner(v.address))
                          .vote(selected);
                        
                        // const te = await ballot.current.proposals(selected);
                        getVoters([
                          ...voters.slice(0, index),
                          { ...v, voted: true },
                          ...voters.slice(index + 1),
                        ]);
                        
                        _getProposals()
                      } catch (e) {
                        console.error(e);
                      }
                    },
                    content: (
                      <Select
                        onChange={(i: number) => {
                          selected = i;
                        }}
                        placeholder="Select a proposal"
                      >
                        {proposals.map((p, inx) => {
                          return <Option value={inx}>{p}</Option>;
                        })}
                      </Select>
                    ),
                  });
                }}
              >
                {i ? "voted" : "vote"}
              </Button>
            ),
          },
          {
            title: "delegate",
            dataIndex: "delegate",
            render: (i, v, index) => (
              <Button
                onClick={() => {
                  let address = "";
                  Modal.info({
                    title: "delegate to address",
                    onOk: async () => {
                      if (!address) return;
                      if (!ballot.current || !provider.current) return;
                      try {
                        const tx = ballot.current
                          .connect(provider.current?.getSigner(v.address))
                          .delegate(address);
                        getVoters([
                          ...voters.slice(0, index),
                          { ...v, delegate: address, voted: true },
                          ...voters.slice(index + 1),
                        ]);
                        _getProposals()
                      } catch (e) {
                        console.log("e", e);
                      }
                    },
                    content: (
                      <Select
                        placeholder="Select a address index"
                        onChange={(v) => {
                          address = v;
                        }}
                      >
                        {voters.map((v1, inx) => (
                          <Option
                            disabled={
                              inx === index || v1.weight.toNumber() === 0
                            }
                            value={v1.address}
                          >{`${inx}: ${v1.address.slice(
                            v1.address.length - 5
                          )}`}</Option>
                        ))}
                      </Select>
                    ),
                  });
                }}
                disabled={!isAddress0(i) || v.weight.toNumber() === 0 || v.voted}
              >
                {isAddress0(i) ? "delegate" : getAddress(i)}
              </Button>
            ),
          },
        ]}
      ></Table>
    </div>
  );
}

export default App;
