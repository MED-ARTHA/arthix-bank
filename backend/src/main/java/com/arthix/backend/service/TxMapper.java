package com.arthix.backend.service;

import com.arthix.backend.dto.BankDtos.TransactionDto;
import com.arthix.backend.entity.Transaction;
import com.arthix.backend.entity.User;

public final class TxMapper {

    private TxMapper() {}

    public static TransactionDto toDto(Transaction t) {
        User u = t.getUser();
        String type = t.getType() == null ? "PAYMENT" : t.getType();
        String sName;
        String sAcc;
        String bName;
        String bAcc;
        switch (type) {
            case "TRANSFER_OUT", "SAVINGS_OUT" -> {
                sName = u.getFullName(); sAcc = u.getAccountNumber();
                bName = t.getCounterpartyName(); bAcc = t.getCounterpartyAccount();
            }
            case "TRANSFER_IN", "DEPOSIT", "SAVINGS_IN" -> {
                sName = t.getCounterpartyName(); sAcc = t.getCounterpartyAccount();
                bName = u.getFullName(); bAcc = u.getAccountNumber();
            }
            default -> {
                sName = u.getFullName(); sAcc = u.getAccountNumber();
                bName = t.getLabel(); bAcc = null;
            }
        }
        String receipt = t.getTransferRef() != null ? t.getTransferRef() : String.format("ARX-%08d", t.getId());
        return new TransactionDto(t.getId(), type, t.getCategory(), t.getLabel(), t.getReference(),
            t.getAmount(), t.getBalanceAfter(), t.getCreatedAt(), receipt,
            sName, sAcc, bName, bAcc, t.getNote());
    }
}