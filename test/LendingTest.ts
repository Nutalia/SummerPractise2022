import { ethers } from "hardhat"
import { Signer } from "ethers"
import { Lending } from "../typechain-types"
import { expect } from "chai"
import { Contract } from "@ethersproject/contracts/lib"

const BUSDaddress = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee" //адрес токена BUSD
const WBNBaddress = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" //адрес токена WBNB

//интерфейс токенов BUSD и WBNB
const abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function transferFrom(address from, address to, uint amount) returns (bool)",
    "function approve(address _spender, uint256 _value) returns (bool)"
];

describe("Lending Test", async () => {
    let user: Signer //пользователь, работающий с контрактом
    let liquidator: Signer; //ликвидатор
    let contract: Lending //тестируемый контракт
    let WBNBtoken: Contract //токен WBNB
    let BUSDtoken: Contract //токен BUSD
    
    //contractBalance >= 2*loan, deposit >= 2*loan
    const contractBalance = 1000000 //количество WBNB токенов, которое будет положено на контракт
    const deposit = 100000 //количество BUSD токенов, которое будет отправлено в качестве залога
    const loan = 20000 //количество WBNB токенов, которое будет запрошено в качестве ссуды
    

    before(async () => {
        //инициализация пользователя
        //user = (await ethers.getSigners() as Signer[])[0]
        let others: Signer[]
        [user, liquidator, ...others] = await ethers.getSigners()

        //деплой контракта, время пользования ссудой - 1 день
        contract = (await (await ethers.getContractFactory("Lending")).deploy(BUSDaddress,WBNBaddress, 24*60*60)) as Lending
        await contract.deployed()

        //инициализация токенов
        WBNBtoken = new ethers.Contract(WBNBaddress, abi, user)
        BUSDtoken = new ethers.Contract(BUSDaddress, abi, user)

        //отправка WBNB токенов в качестве баланса контракта
        let tx = await WBNBtoken.transfer(contract.address, contractBalance)
        await tx.wait()
    })


    it("borrow test", async () => {
        //разрешение контракту списывать BUSD токены со счета пользователя
        let tx = await BUSDtoken.approve(contract.address, deposit)
        await tx.wait()
        
        //запрос ссуды
        tx = await contract.borrow(deposit,loan)
        await tx.wait()

        //баланс WBNB и BUSD токенов контракта изменился
        await expect(await BUSDtoken.balanceOf(contract.address)).to.equal(deposit)
        await expect(await WBNBtoken.balanceOf(contract.address)).to.equal(contractBalance - loan)
    })


    //нельзя запросить ссуду, если она уже есть у данного пользователя
    it("trying to borrow twice", async () => {
        let message = "no error"
        try{ await contract.borrow(deposit,loan) }
        catch(err) { message = (err as any).reason }
        expect(message).to.include("This address already has a loan")
    })

    
    //нельзя ликвидировать ссуду до истечения срока пользования
    it("trying to liquidate loan before time's up", async () => {
        let message = "no error"
        try{ await contract.connect(liquidator).liquidate(await user.getAddress()) }
        catch(err) { message = (err as any).reason }
        expect(message).to.include("Time for using the loan hasn't expired yet")
    })


    it("repay test", async () => {
        //разрешение контракту списывать WBNB токены, на всякий случай,
        //в 2 раза больше, чем было запрошено, т.к. возврат долга происходит с процентами
        let tx = await WBNBtoken.approve(contract.address, 2*loan)
        await tx.wait()

        //возврат долга
        tx = await contract.repay()
        await tx.wait()

        //баланс WBNB и BUSD токенов контракта изменился
        await expect(await BUSDtoken.balanceOf(contract.address)).to.equal(0)
        let expectedBalance = loan*12/100 + contractBalance
        await expect(await WBNBtoken.balanceOf(contract.address)).to.equal(expectedBalance)
    })


    //нельзя вызвать repay, если нет ссуды
    it("trying to repay without having a loan", async () => {
        let message = "no error"
        try{ await contract.repay() } 
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("This address doesn't have a loan")
    })


    it("trying to liquidate non-existent loan", async () => {
        let message = "no error"
        try{ await contract.connect(liquidator).liquidate(await user.getAddress()) } 
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("This address doesn't have a loan")
    })


    it("trying to borrow with wrong inputs", async () => {
        let message = "no error"

        //нельзя запросить нулевую ссуду
        try{ await contract.borrow(0, 0) } 
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("Zero loan")

        //залог должен быть как минимум в 2 раза больше ссуды
        try{ await contract.borrow(loan/2, loan) } 
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("Deposit must be at least twice the amount of the loan")

        //нельзя запросить залог, превышающий баланс контракта
        try{ await contract.borrow(deposit, 2*contractBalance) } 
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("Not enough tokens for loan")
    })


    it("trying to repay, borrow and liquidate when time's up", async () => {
        //деплой контракта, время пользования ссудой - 1 секунда
        let shortContract = (await (await ethers.getContractFactory("Lending")).deploy(BUSDaddress,WBNBaddress, 1)) as Lending
        let tx = await WBNBtoken.transfer(shortContract.address, contractBalance)
        await tx.wait()

        //разрешение контракту списывать BUSD токены
        tx = await BUSDtoken.approve(shortContract.address, deposit)
        await tx.wait()
        
        //запрос ссуды
        tx = await shortContract.borrow(deposit,loan)
        await tx.wait()

        //ожидание истечения срока пользования ссудой
        new Promise((f) => setTimeout(f, 1500))

        let message = "no error"
        //repay вызвать нельзя, т.к. время истекло
        try{ await shortContract.repay() }
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("Loan time's up")

        //время истекло, запросить ссуду нельзя
        try{ await shortContract.borrow(deposit,loan) }
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("This address already has a loan")

        //нельзя ликвидировать собственную ссуду
        try{ await shortContract.liquidate(await user.getAddress()) }
        catch(err) { message = (err as any).reason }
        await expect(message).to.include("You can't liquidate your own loan")

        //ликвидация ссуды
        tx = await shortContract.connect(liquidator).liquidate(await user.getAddress())
        await tx.wait()
        expect(await BUSDtoken.balanceOf(shortContract.address)).to.equal(deposit - deposit/100)
    })
})