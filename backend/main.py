import asyncio

from openai import AsyncOpenAI
from agents import set_default_openai_client
from notes.updater import NotesUpdater

async def main():
    updater = NotesUpdater()
    await updater.start()

    await updater.add_update("""For CPU virtualization, there are two primary concerns:
1. **performance**: how can we implement virtualization without too much overhead?
2. **control**: how can we run processes efficiently while still maintaining control over the CPU?

One common solution to this is **limited direct execution** (**LDE**), which, as its name suggests, consists of two parts:
1. **direct execution**: programs run directly on the CPU (which results in better performance)
2. **limited**: the use of restricted operations and the ability to stop a process from running and switch to another one
## Restricted Operations
There are some operations that we don't want to give programs unrestricted access to; for example, requesting data from a disk or getting more CPU/memory.

Modern operating systems typically solve this by introducing two processor modes:
1. **user mode**: when in user mode, a process is restricted; for example, trying to issue an I/O request while in user mode would likely raise an exception and cause the OS to kill the process
2. **kernel mode**: the operating system (or kernel) runs in kernel mode; here, code can do whatever it likes
### System Calls
When a user process wants to perform a privileged operation like reading from disk, it performs a **system call**.

To perform a system call, a program executes a **trap** instruction which simultaneously jumps into the kernel and raises the privilege level to kernel mode. When the OS is done, it calls a **return-from-trap** instruction which is the exact reverse: simultaneously returns into the calling program and reduces the privilege level to user mode.
- When executing a trap, the hardware needs to make sure to save enough of the caller's registers to be able to return properly when the return-from-trap is issued. On x86, this is pushed onto a per-process **kernel stack** and the return-from-trap pops these values off the stack.
- At boot time, the kernel sets up a **trap table**, which tells the hardware what code to run when certain events occur (like a keyboard interrupt or a system call). The code that is run are called **trap handlers**. The hardware remembers this info until the machine is next rebooted.
	- Telling the hardware where the trap table is is a privileged operation; it can only be done in kernel mode!
- The exact system call is typically identified via a unique **system-call number**, which is placed in a specific location by the user code.
	- This is because we don't want the user code to jump to whatever it wants to for security reasons; it must be a valid system call.

Most operating systems provide a few hundred kinds of system calls (e.g., [man page](https://man7.org/linux/man-pages/man2/syscalls.2.html); [Chromium OS system call IDs](https://chromium.googlesource.com/chromiumos/docs/+/master/constants/syscalls.md)).
## Switching Between Processes
How does the OS regain control of the CPU while a process is running if the process runs directly on the CPU? There are two approaches to this:
1. The **cooperative approach** is the idea where the OS will *trust* processes to periodically give up the CPU so the OS can run another task. This is done via system calls; in these types of systems, there's often a **yield** system call which does nothing but transfer control to the OS. Doing something "illegal" (like accessing memory it shouldn't) also generates a trap to the OS. This was done in some early versions of the Macintosh operating system.
	- The issue with this is that if a process (malicious or not) ends up in an infinite loop, the OS can't do anything; the only solution is to reboot the machine.
2. The **non-cooperative approach** consists of forcibly taking control from processes via a **timer interrupt**, which raises an interrupt every few milliseconds, causing the process to be halted and an **interrupt handler** in the OS to run.
	- Just like the trap handlers, the interrupt handler is defined at boot time.
	- The timer is also started at boot time; this is also a privileged operation. The timer can be turned off, which may be done for concurrency reasons.

The above two approaches revolve around having some way to transfer control back to the OS, whether it's by trusting the process to do so or doing it via a timer; once the OS gets control, it has to make the choice to either continue running the process or switch to another one. This is chosen by the **scheduler**.
- If the scheduler decides to switch, the OS executes low-level code called a **context switch**. """)

    await asyncio.sleep(5)  # wait for tasks
    await updater.stop()

if __name__ == "__main__":
    custom_client = AsyncOpenAI(base_url="http://localhost:1234/v1", api_key="")
    set_default_openai_client(custom_client)

    asyncio.run(main())
