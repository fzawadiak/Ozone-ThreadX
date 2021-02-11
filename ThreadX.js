/*
 * Copyright 2021 Filip Zawadiak
 * SPDX-License-Identifier: BSD-2-Clause
 *
 */

function init(){
	Threads.clear();
	Threads.setColumns("Thread","Priority","State","Runs");
	Threads.setSortByNumber("Priority");
	
	if (Threads.setColor)
		Threads.setColor("State", "Ready", "Executing", "Waiting");

	Threads.newqueue("Mutexes");
	Threads.setColumns("Mutex","Owner","Suspended");
	
	Threads.newqueue("Semaphores");
	Threads.setColumns("Semaphore","Count","Suspended");
}
	
function threadDescription(thread) {
	switch(thread.tx_thread_state) {
		case 0: return "Ready";
		case 1: return "Completed";
		case 2: return "Terminated";
		case 3: return "Suspended";
		case 4: return "Sleeping";
		// Wait on Message Queue
		case 5: {
			return "Waiting - Queue";
		};
		// Wait on Semaphore
		case 6: {
			return "Waiting - Semaphore";
		};
		// Wait on Event Flags
		case 7: {
			return "Waiting - Event flag";
		};
		// Wait on Block Pool
		case 8: {
			return "Waiting - Block pool";
		};
		// Wait on Byte Pool
		case 9: {
			return "Waiting - Byte pool";
		};
		// Wait on FX IO
		case 10: {
			return "Waiting - I/O";
		};
		// Wait on FX
		case 11: {
			return "Waiting - Filesystem";
		};
		// Wait on NX
		case 12: {
			return "Waiting - Network";
		};
		// Wait on Mutex
		case 13: {
			return "Waiting - Mutex";
		}
		default: return "Other";
	}
}

function updateThreads() {
	var executing = Debug.evaluate("(TX_THREAD*)_tx_thread_current_ptr");
	var first = Debug.evaluate("(TX_THREAD*)_tx_thread_created_ptr");
	var current = first;
	do {
		var thread = Debug.evaluate("*(TX_THREAD*)" + current);
		var name = Debug.evaluate("((TX_THREAD*)" + current + ")->tx_thread_name");
		Threads.add(
			name,
			thread.tx_thread_priority,
			current==executing?"Executing":threadDescription(thread),
			thread.tx_thread_run_count,
			current==executing?undefined:current);
		current = thread.tx_thread_created_next;
	} while(current != first);
}

function updateMutexes() {
	var first = Debug.evaluate("(TX_MUTEX*)_tx_mutex_created_ptr");
	var current = first;
	do {
		var mutex = Debug.evaluate("*(TX_MUTEX*)" + current);
		var name = Debug.evaluate("((TX_MUTEX*)" + current + ")->tx_mutex_name");
		var owner = "";
		var waiting = "";
		if(mutex.tx_mutex_owner != 0)
			owner = Debug.evaluate("((TX_THREAD*)" + mutex.tx_mutex_owner + ")->tx_thread_name");
		if(mutex.tx_mutex_suspension_list != 0)
			waiting = Debug.evaluate("((TX_THREAD*)" + mutex.tx_mutex_suspension_list + ")->tx_thread_name");
		Threads.add2(
			"Mutexes",
			name,
			owner,
			waiting);
		current = mutex.tx_mutex_created_next;
	} while(current != first);
}

function updateSemaphores() {
	var first = Debug.evaluate("(TX_SEMAPHORE*)_tx_semaphore_created_ptr");
	var current = first;
	do {
		var semaphore = Debug.evaluate("*(TX_SEMAPHORE*)" + current);
		var name = Debug.evaluate("((TX_SEMAPHORE*)" + current + ")->tx_semaphore_name");
		var waiting = "";
		if(semaphore.tx_mutex_suspension_list != 0)
			waiting = Debug.evaluate("((TX_THREAD*)" + semaphore.tx_semaphore_suspension_list + ")->tx_thread_name");
		Threads.add2(
			"Semaphores",
			name,
			semaphore.tx_semaphore_count,
			waiting);
		current = semaphore.tx_semaphore_created_next;
	} while(current != first);
}

function update(){
	Threads.clear();
	updateThreads();

	if (Threads.shown("Mutexes")) {
		updateMutexes();
	}
	if (Threads.shown("Semaphores")) {
		updateSemaphores();
	}
}

function getregs(thread) { 
	var i;
	var SP;
	var LR;
	var ptr;
	var thread;
	var reg = new Array(17);

	thread  =  Debug.evaluate("*(TX_THREAD*)" + thread);
	SP   =  thread.tx_thread_stack_ptr;
	ptr =  SP;

	LR = TargetInterface.peekWord(ptr);
	ptr += 4;

	/* If LR&0x10 skip over S16...S31 */
	if ((LR & 0x10) != 0x10) {
		ptr += 4*16; // skip S16..S31
	}

	/* R4...R11 */
	for (i = 4; i < 12; i++) {
		reg[i] = TargetInterface.peekWord(ptr); 
		ptr += 4;
	}

	/* R0...R3 */
	for (i = 0; i < 4; i++) {
		reg[i] = TargetInterface.peekWord(ptr);  
		ptr += 4;
	}
 
	/* R12, LR, PC, PSR */
	reg[12] = TargetInterface.peekWord(ptr); 
	ptr += 4;
	reg[14] = TargetInterface.peekWord(ptr);  
	ptr += 4;
	reg[15] = TargetInterface.peekWord(ptr); 
	ptr += 4;
	reg[16] = TargetInterface.peekWord(ptr); 
	ptr += 4;

	/* If LR&0x10 skip over S0..S15 */
	if ((LR & 0x10) != 0x10) {
		ptr += 4*18;
	}
	
	/* Check if stack aligned to 8 bytes */
	if (reg[16] & (1<<9)) {
		ptr += 4;
	}
	
	/* SP */
	reg[13] = SP;
  
	return reg;
}

function getname(thread){
	var tcb;
	tcb = Debug.evaluate("*(TX_THREAD*)" + thread);
	return tcb.tx_thread_name;
}

function getOSName() {
	return "ThreadX";
}

function getContextSwitchAddrs(){
	return [
		Debug.evaluate("_tx_thread_system_suspend")
	];
}
