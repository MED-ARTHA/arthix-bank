package com.arthix.backend.entity;

public enum TransferType {
    /** Executed right away through the existing POST /api/transfers endpoint. */
    IMMEDIATE,
    SCHEDULED,
    RECURRING
}