# Смарт-контракт для выдачи займов 

## Описание смарт-контракта (contracts/Lending.sol)

borrow(_deposit, _loan): _deposit - количество токенов BUSD, которые будут приняты в качестве депозита, _loan - запрашиваемое количество WBNB токенов

repay(): возвращает депозит (BUSD) и забирает долг (WBNB)

## Тестирование (test/LendingTest.ts)

В файле wallet.ts необходимо задать закрытый ключ кошелька, на котором лежат WBNB-токены (не менее 2\*сontractBalance + loan) и BUSD-токены (не менее 2\*deposit)

    export const privateKey = '...'

Также необходимо добавить закрытый ключ кошелька, на котором лежат WBNB-токены (не менее loan). Данный кошелек нужен в тесте "trying to repay, borrow and liquidate when time's up"

    export const anotherKey = '...'

## Деплой контракта (scripts/deploy.ts)

    npx hardhat run --network testnet scripts/deploy.ts

Контракт будет добавлен в BSC testnet с указанным адресом (ADDRESS) и балансом. При деплое на основном кошельке (определяемом ключом privateKey) должны быть WBNB-токены не менее balance.

## Верификация контракта

    npx hardhat verify --network testnet ADDRESS "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee" "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" 86400

