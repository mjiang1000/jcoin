// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <9.0.0;
import "hardhat/console.sol";

contract Ballot {
    struct Voter {
        uint weight;
        uint vote;
        bool voted;
        address delegate;
    }

    struct Proposal {
        bytes32 name;
        uint voteCount;
    }
    address public chairperson;
    mapping(address =>  Voter) public voters;
    Proposal[] public proposals;

    constructor(bytes32[] memory proposalNames) {
        chairperson = msg.sender;
        voters[chairperson].weight = 1;

        for(uint i=0; i<proposalNames.length; i++) {
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0
            }));
        }
    }

    function giveRightToVote(address voter) external {
        console.log("giveRightToVote address:", voter);
        require(msg.sender == chairperson,
         "only chairprson can give right to vote");

        require(!voters[voter].voted,
        "the voter already voted");

        require(voters[voter].weight == 0);
        voters[voter].weight = 1;
    }


    function delegate(address to )external {
        Voter storage sender = voters[msg.sender];
        require(sender.weight != 0, 
        "you have no right to vote");

        require(!sender.voted, 
        "you have already voted");

        require(to != msg.sender, "selg-delegation is disallowed");

        while (voters[to].delegate != address(0x0)) {
            to = voters[to].delegate;
            require(to != msg.sender, "found loop in delegation");
        }
        Voter storage delegate_ = voters[to];
        require(delegate_.weight >= 1, "no right");
        sender.voted = true;
        sender.delegate = to;

        if (delegate_.voted) {
            proposals[delegate_.vote].voteCount += sender.weight;
        } else {
            delegate_.weight += sender.weight;
        }

    }

    function vote(uint proposal) external{
        Voter storage voter = voters[msg.sender];
        require(voter.weight != 0, 
        'has no right to vote');

        require(!voter.voted, 
        'has already voted');


        voter.voted = true;
        voter.vote = proposal;

        proposals[proposal].voteCount += voter.weight;
    }

    function winningProposal() public view returns (uint proposal_) {
        uint count = 0;
        for (uint i =0; i<proposals.length; i++) {
            if (proposals[i].voteCount > count) {
                count = proposals[i].voteCount;
                proposal_ = i;
            }
        }
    }

    function winningProposalName() public view returns (bytes32 name) {
        name = proposals[winningProposal()].name;
    }
}