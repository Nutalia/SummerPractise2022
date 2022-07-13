# Смарт-контракт для выдачи займов (contracts/Lending.sol)

borrow(_deposit, _loan): _deposit - количество токенов BUSD, которые будут приняты в качестве депозита, _loan - запрашиваемое количество WBNB токенов

repay(): возвращает депозит (BUSD) и забирает долг (WBNB)

# Тестирование (test/LendingTest.ts)

В файле wallet.ts необходимо задать закрытый ключ кошелька, на котором лежат WBNB-токены (не менее 2\*сontractBalance + loan) и BUSD-токены (не менее 2\*deposit)

    export const privateKey = '...'