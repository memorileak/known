+++
title = "RocksDB"
date = "2024-07-10"
description = "RocksDB knowledge"
[taxonomies]
tags = ["rocksdb"]
[extra]
cover_image = "images/rocksdb.png"
+++

RocksDB knowledge

## High level architecture

## Memtable

In-memory data structure, new writes are inserted to the memtable and optionally written to the Write-Ahead Log (WAL).
Memtable holds data before they are flushed to SST files.
It serves both read and write, read queries have to read from memtable before reading SST files.
Once the memtable is full, it becomes immutable and is replaced by a new memtable.
A background thread will flush the already full memtable to SST files.

Memtable implementation can be based on one of these:
- SkipList
- HashSkipList
- HashLinkList
- Vector

Each implementation has its advantages and downsides.

## Write-Ahead Log (WAL)

Write sequentially -> fast

## Memtable

## Sorted Strings Table (SST)

## Log-Structured Merge-Tree (LSM Tree)

## Compaction

## Iterator & Snapshot
