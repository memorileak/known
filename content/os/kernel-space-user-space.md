+++
title = "Kernel Space and User Space"
description = "An explanation of kernel space vs. user space, why hardware support is required to enforce the boundary, and how the CPU traps into the kernel via system calls."
date = 2026-09-15

[taxonomies]
tags = ["kernel"]

# [extra]
# math = false
# cover.image = "images/cover.png"
+++

## Understanding Kernel Space and User Space

**Kernel space** and **user space** represent two distinct memory areas and execution modes designed to isolate user applications from the core operating system and physical hardware.

### 1. What is Kernel Space and User Space?

* **Kernel Space (Kernel Mode)**: This is the elevated, protected execution environment and memory region where the core operating system (the kernel) resides and executes. When the CPU is executing in kernel mode, it has unrestricted access to all physical hardware resources, complete system memory (both kernel and user address spaces), and all hardware instructions. This includes **privileged instructions** such as direct I/O manipulation, timer control, disabling interrupts, and system halt commands.
* **User Space (User Mode)**: This is the restricted execution environment and virtual address space reserved for user processes and applications (e.g., text editors, compilers, web browsers, and command shells). Code executing in user mode can only access its own assigned address space and non-privileged CPU instructions. It is strictly prevented from directly reading or modifying kernel memory or directly issuing instructions that control hardware devices. If a user-space process attempts an illegal memory access or privileged operation, the hardware traps the error to the OS (resulting in an exception such as a segmentation fault).

### 2. Does Distinguishing Between the Two Require Hardware Support?

**Yes, distinguishing between kernel space and user space strictly requires hardware support**. 

Proper operating system isolation and protection cannot be implemented purely in software because user applications could easily bypass software-only restrictions. The underlying processor hardware must natively support distinct execution levels or modes. Without processor-level execution modes and memory-management unit (MMU) enforcement, an errant or malicious user program could modify kernel data structures or crash the entire computer system.

### 3. How Does the CPU Know It Is Executing Kernel or User Space Code?

The CPU tracks and enforces its current execution state using dedicated hardware mechanisms built into the processor:

1. **The Hardware Mode Bit & Protection Rings**:
   Processors include a hardware **mode bit** (or privilege bits) in internal control registers. In a classic dual-mode architecture, the mode bit is set to `0` for kernel mode and `1` for user mode. On x86 architectures, this is implemented via **protection rings**, where **Ring 0** corresponds to kernel mode (full privilege) and **Ring 3** corresponds to user mode (least privilege), tracked by current privilege level bits in processor registers.
2. **Memory Page Protection Checks**:
   Areas of virtual memory are tagged in page tables as belonging to kernel space or user space. During every memory access, the MMU checks the current CPU mode bit against the page's access permissions. If a processor running in user mode (`mode bit = 1` or Ring 3) attempts to access a page marked for kernel space (`mode bit = 0` or Ring 0), the hardware generates a memory protection trap.
3. **Controlled Mode Transitions**:
   * **Boot Time**: The computer hardware starts up in kernel mode (`0`), allowing the operating system to safely load, initialize hardware drivers, and establish trap vectors.
   * **Switching to User Mode**: Before handing control to a user process, the kernel executes an instruction that sets the mode bit to `1` (user mode).
   * **Trapping into Kernel Mode**: When a user process requires OS services (via a system call) or when a hardware interrupt/exception occurs, the processor automatically saves the current user context, switches the mode bit to `0` (kernel mode), and jumps to a predefined, guarded handler location in kernel memory. User code cannot jump to arbitrary kernel addresses; it must pass through these strict hardware-enforced gates.
   * **Returning to User Mode**: When the kernel completes the service request or interrupt handler, it issues a return instruction (e.g., `iret` or `sysexit`), which restores the user context and sets the mode bit back to `1`.

---

## How System Calls Cross the Kernel-User Boundary

In Linux and modern CPU architectures, **trapping into kernel mode** is the hardware-enforced mechanism that allows an unprivileged user-space application to securely request kernel services.

### 1. How "Trapping into Kernel Mode" Works in Linux

Transitioning from user mode to kernel mode involves a tightly coordinated sequence between the C library, processor hardware, and kernel trap handlers:

1. **User-Space Setup & C Library Wrapper**: An application calls an API function (such as `open()` or `write()`). The C library (glibc) wrapper copies the call arguments into specific CPU registers (e.g., `%ebx`, `%ecx` on x86) and places the unique **system call number** into a designated register (e.g., `%eax` / `%rax`).
2. **Executing the Trap Instruction**: The wrapper executes a dedicated hardware instruction—such as **`int 0x80`** (software interrupt trap instruction) or modern fast-entry instructions like **`syscall`** / **`sysenter`** (x86) or **`SVC`** (ARM)—which triggers a software exception.
3. **Hardware Mode Switch & Jump**: The CPU hardware intercepts this instruction, automatically switches its hardware privilege level from **user mode (Ring 3)** to **kernel mode (Ring 0)**, and forces execution to jump to a fixed, predefined location in kernel memory (the `system_call()` trap handler).
4. **Context Saving & Service Execution**: The kernel saves the application’s registers onto the thread's private **kernel stack**. It validates the system call number against `NR_syscalls` and uses it as an index into the **`sys_call_table`** to execute the corresponding kernel service routine.
5. **Returning to User Space**: Once completed, the kernel restores the saved registers and executes a return instruction (such as `iret`, `sysret`, or `sysexit`), which simultaneously restores the CPU privilege level back to user mode and hands control back to the application.

### 2. Are There Special Instructions for Changing Privilege Levels?

* **User-Accessible Gate Instructions**: Yes. Instructions such as **`syscall`**, **`sysenter`**, **`int 0x80`**, and **`SVC`** exist specifically as "doors" or gate portals allowing user-space code to request a controlled transition into kernel mode.
* **General Mode Modification Instructions**: However, there is **no instruction** that allows a user-space application to arbitrarily set the privilege level bit or flip execution rings at will. Instructions that directly modify CPU control registers or privilege flags (such as x86 `%cr3` or privilege bits in `EFLAGS`) are designated as **privileged instructions**. The processor allows privileged instructions to execute **only** when the CPU is already in kernel mode.

### 3. How the System Guards Against Unauthorized User-Space Actions

The operating system and CPU hardware enforce protection through several hardware-backed barriers:

* **Fixed, Predefined Entry Targets**: When an application issues a trap instruction (`syscall` or `int 0x80`), user-space code **cannot specify an arbitrary target address** in kernel memory. The hardware restricts the jump strictly to a predefined, well-guarded code path registered in hardware control structures by the kernel during system boot.
* **Hardware Trapping of Privileged Instructions**: If a program in user mode attempts to execute a privileged instruction or manually modify control registers, the CPU detects the ring violation, prevents execution, and generates a **General Protection Fault** / exception. The kernel catches this hardware fault and typically terminates the offending process.
* **MMU Page Table Protection**: Virtual memory pages belonging to kernel space are flagged as supervisor/kernel-only in page tables. The Memory Management Unit (MMU) checks these protection bits on every memory access; any attempt by user-mode code (`Ring 3`) to read, write, or execute kernel memory (`Ring 0`) triggers an immediate hardware page fault.
* **Kernel Parameter Validation**: Even after passing through a valid system call gate, the kernel treats all arguments provided by user space as untrusted. Routines like `copy_from_user()` verify that provided pointers reside strictly within the calling process's allowed user address space before dereferencing them.

