// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Token {
    function transfer(address, uint)public returns(bool){}
    function transferFrom(address,address,uint)public returns(bool){}
    function balanceOf(address)public view returns(uint){}
}

contract Lending {
    uint public loanTime; //время, на которое выдается ссуда
    uint ratio = 2; //во сколько раз залог должен быть больше ссуды
    Token busd; //токены залога
    Token wbnb; //токены ссуды
    mapping (address => uint) deposit;
    mapping (address => uint) loan;
    mapping (address => uint) time;

    constructor(address BUSD_addr, address WBNB_addr, uint _loanTime) {
        busd=Token(BUSD_addr);
        wbnb=Token(WBNB_addr);
        loanTime = _loanTime;
    }

    function borrow(uint _deposit, uint _loan) public {
        //либо ссуда еще не бралась (или был вызван repay), либо время пользования ссудой истекло
        require(time[msg.sender] == 0 || block.timestamp - time[msg.sender] > loanTime, "This address already has a loan");
        //нельзя запросить нулевую ссуду и ссуду, превашающую баланс контракта
        require(_loan > 0, "Zero loan");
        require(wbnb.balanceOf(address(this)) >= _loan, "Not enough tokens for loan");
        //ограничение залога размером ссуды и балансом отправителя
        require(_deposit >= ratio*_loan, "Deposit must be at least twice the amount of the loan");
        require(busd.balanceOf(msg.sender) >= _deposit, "Not enough tokens for deposit");
        //забираем залог
        busd.transferFrom(msg.sender, address(this), _deposit);
        deposit[msg.sender] = _deposit;
        //выдаем ссуду
        wbnb.transfer(msg.sender, _loan);
        loan[msg.sender] = _loan;
        //запоминаем время займа
        time[msg.sender] = block.timestamp;
    }

    function repay() public {
        //нельзя вернуть ссуду, если не вызывался borrow
        require(time[msg.sender] != 0, "This address doesn't have a loan");
        uint lendingTime = block.timestamp - time[msg.sender]; //время пользования ссудой
        require(lendingTime <= loanTime, "Loan time's up");
        uint amountOfRepay = loan[msg.sender] + loan[msg.sender]*lendingTime/(loanTime); //размер долга
        require(wbnb.balanceOf(msg.sender) >= amountOfRepay, "Not enough tokens for repay");
        //возврат долга
        wbnb.transferFrom(msg.sender, address(this), amountOfRepay);
        //возврат залога
        busd.transfer( msg.sender, deposit[msg.sender]);
        time[msg.sender] = 0;
    }
}