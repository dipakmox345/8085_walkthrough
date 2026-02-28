import { useState, useEffect } from "react";

const programs = [
  {
    id: 1, title: "Divide Two 8-Bit Numbers", short: "Division",
    addresses: "Dividend: D000H | Divisor: D001H | Quotient: D002H | Remainder: D003H",
    summary: "We divide by repeatedly subtracting the divisor from the dividend. Every time we subtract successfully, we count it. That count IS the quotient. Whatever's left after we can't subtract anymore IS the remainder.",
    steps: [
      { instr: "LDA D001H", why: "We load the DIVISOR first — because we need to check if it's zero before anything else. If divisor is zero, division is impossible (infinite loop).", reg: "A ← [D001H]", key: "Safety-first: always validate input before using it." },
      { instr: "ORA A", why: "OR the accumulator with itself. This doesn't change A but it SETS the Zero flag if A = 00H. It's a clever trick to test if A is zero without wasting a register.", reg: "Flags updated", key: "ORA A is the 8085 idiom for 'is A zero?'" },
      { instr: "JZ ERROR", why: "If Zero flag is set (divisor was 00H), we jump to ERROR handler. This prevents the infinite loop that would happen if we tried to subtract zero forever.", reg: "PC → ERROR if Z=1", key: "Guard clause — handle the impossible case first." },
      { instr: "MOV C, A", why: "Save the divisor in register C. We need A free for other operations but we need the divisor throughout the loop.", reg: "C ← A (divisor)", key: "C holds the divisor permanently for the whole program." },
      { instr: "LDA D000H", why: "Now load the dividend (the number being divided). We couldn't load this first because we needed A to check the divisor.", reg: "A ← [D000H]", key: "Dividend comes second after divisor validation." },
      { instr: "MOV B, A", why: "Save dividend in B. B will act as our 'running remainder' — it starts as the full dividend and shrinks every time we subtract.", reg: "B ← A (dividend)", key: "B = current remainder. Starts at dividend, shrinks each loop." },
      { instr: "MVI D, 00H", why: "Initialize quotient counter to 0. D will count HOW MANY TIMES we successfully subtracted. That count = quotient.", reg: "D ← 00H", key: "D = quotient counter. Each successful subtraction = +1 here." },
      { instr: "BACK: MOV A, B", why: "Load current remainder into A so we can compare it. We work with A for arithmetic, B just stores the value between iterations.", reg: "A ← B (current remainder)", key: "Top of loop: pull the current remainder into A for comparison." },
      { instr: "CMP C", why: "Compare A (remainder) with C (divisor). The CPU subtracts C from A internally but doesn't store the result — it just sets flags. If remainder < divisor, Carry flag gets set.", reg: "Flags ← A - C (no store)", key: "CMP asks: 'is remainder still ≥ divisor?' without destroying A." },
      { instr: "JC DONE", why: "Jump if Carry is set. Carry set means A < C, meaning remainder < divisor. We can't subtract anymore — division is complete!", reg: "PC → DONE if CY=1", key: "Exit condition: once remainder < divisor, we're done." },
      { instr: "SUB C", why: "Subtract divisor from remainder. This is the actual division step — we're eating away at the dividend one divisor-sized chunk at a time.", reg: "A ← A - C", key: "The core of repeated subtraction division." },
      { instr: "MOV B, A", why: "Store the new (smaller) remainder back in B so it's safe for the next iteration.", reg: "B ← A (new remainder)", key: "Save updated remainder back to B before looping." },
      { instr: "INR D", why: "Increment quotient counter. We just did one successful subtraction, so quotient goes up by 1.", reg: "D ← D + 1", key: "Each successful subtraction = one more unit of quotient." },
      { instr: "JMP BACK", why: "Go back and try to subtract again. This loop continues until remainder < divisor.", reg: "PC → BACK", key: "Unconditional loop — keep subtracting until CMP catches us." },
      { instr: "DONE: LXI H, D002H", why: "Load address D002H into HL register pair. We're pointing HL at the quotient storage location.", reg: "HL ← D002H", key: "HL = address pointer. We're setting up to store results." },
      { instr: "MOV M, D", why: "M means 'memory at address HL'. So this stores quotient (D) into D002H.", reg: "[D002H] ← D (quotient)", key: "MOV M, r always writes register r to address in HL." },
      { instr: "INX H", why: "Increment HL by 1 so it now points to D003H — the next memory location for the remainder.", reg: "HL ← D003H", key: "INX H moves the pointer forward by one address." },
      { instr: "MOV M, B", why: "Store remainder (B) into D003H. Both results are now saved in consecutive memory.", reg: "[D003H] ← B (remainder)", key: "Consecutive storage: quotient at D002H, remainder at D003H." },
      { instr: "RST 1", why: "Program ends here. RST 1 jumps to the monitor routine on the trainer kit which stops execution.", reg: "STOP", key: "RST 1 = program terminator on 8085 trainer boards." },
      { instr: "ERROR: MVI A, FFH", why: "We reach here only if divisor was zero. FFH is our error code — a value that can't be a real quotient.", reg: "A ← FFH", key: "FFH is used as error sentinel — signals invalid division." },
      { instr: "STA D002H", why: "Store error code FFH at D002H so whoever reads the output knows the division was invalid.", reg: "[D002H] ← FFH", key: "Error output goes to same quotient address so it's found easily." },
      { instr: "RST 1", why: "Stop after error handling.", reg: "STOP", key: "Always terminate cleanly even on error." },
    ]
  },
  {
    id: 2, title: "Count Even Bytes (7501H–75FFH)", short: "Even Counter",
    addresses: "Block: 7501H to 75FFH | Result: 7600H",
    summary: "We scan every byte in the block. For each byte, we check its last bit (LSB). If LSB is 0, the number is even. We count all evens.",
    steps: [
      { instr: "LXI H, 7501H", why: "Set HL to point at the start of our block. HL acts as a moving pointer — we'll increment it after each byte.", reg: "HL ← 7501H", key: "LXI H = Load HL with a 16-bit address. Our starting gun." },
      { instr: "MVI C, 00H", why: "Initialize even-byte counter to 0. C will be incremented every time we find an even number.", reg: "C ← 00H", key: "C = the answer we're building up. Starts at zero." },
      { instr: "MVI B, FFH", why: "Set loop counter to 255 (FFH). The block has 255 bytes (7501H to 75FFH). B counts down to zero.", reg: "B ← FFH", key: "B = countdown timer. One tick per byte processed." },
      { instr: "BACK: MOV A, M", why: "Load the byte at current HL address into A. M means 'memory at HL'. This reads the current byte we're testing.", reg: "A ← [HL]", key: "MOV A, M = read one byte from wherever HL points." },
      { instr: "ANI 01H", why: "AND accumulator with 00000001. This zeros out all bits EXCEPT bit 0 (LSB). If the number was even, LSB was 0, so A becomes 00H and Zero flag sets.", reg: "A ← A AND 01H", key: "Masking: ANI 01H isolates only the last bit. Even = last bit is 0." },
      { instr: "JNZ ODD", why: "If result is NOT zero, LSB was 1, meaning ODD number. Skip the counter increment.", reg: "PC → ODD if Z=0", key: "JNZ = Jump if Not Zero. Odd numbers escape the counter." },
      { instr: "INR C", why: "We only reach here if number was even (JNZ didn't jump). Increment the even counter.", reg: "C ← C + 1", key: "This line is skipped for odd numbers. Only runs for evens." },
      { instr: "ODD: INX H", why: "Move HL to next memory address regardless of even/odd. We must process every byte in the block.", reg: "HL ← HL + 1", key: "INX H advances the pointer. Both ODD and EVEN paths meet here." },
      { instr: "DCR B", why: "Decrement the loop counter. B tracks how many bytes are left to process.", reg: "B ← B - 1", key: "DCR sets Zero flag when B hits 00H — that's our exit signal." },
      { instr: "JNZ BACK", why: "If B isn't zero yet, more bytes remain. Go back to BACK and process next byte.", reg: "PC → BACK if Z=0", key: "Loop continues until B = 0 (all 255 bytes processed)." },
      { instr: "LXI H, 7600H", why: "Point HL at the result storage address. We're done counting, now we need to save the answer.", reg: "HL ← 7600H", key: "After loop: redirect HL to the output address." },
      { instr: "MOV M, C", why: "Store even count (C) into memory at 7600H. C holds our final answer.", reg: "[7600H] ← C", key: "MOV M, C writes our result to the destination address." },
      { instr: "RST 1", why: "Program done. Go check 7600H for the count of even bytes.", reg: "STOP", key: "Result is waiting at 7600H." },
    ]
  },
  {
    id: 3, title: "Count ADH Occurrences (C000H–C00FH)", short: "Search ADH",
    addresses: "Block: C000H to C00FH | Search: ADH | Result: D000H",
    summary: "Scan 16 bytes. For each byte, compare it to ADH. If they match, increment a counter. Store the final count.",
    steps: [
      { instr: "LXI H, C000H", why: "Point HL at the start of the 16-byte block we're searching through.", reg: "HL ← C000H", key: "HL = search pointer. Starts at block beginning." },
      { instr: "MVI C, 00H", why: "Initialize occurrence counter to 0. C counts how many times ADH appears.", reg: "C ← 00H", key: "C = match counter. Our final answer lives here." },
      { instr: "MVI B, 10H", why: "10H = 16 decimal. The block C000H to C00FH is exactly 16 bytes. B is our loop counter.", reg: "B ← 10H", key: "10H = 16. Block size determines loop count." },
      { instr: "BACK: MOV A, M", why: "Read current byte from memory into A for comparison.", reg: "A ← [HL]", key: "Always load into A before comparing — CPI works on A only." },
      { instr: "CPI ADH", why: "Compare Immediate: subtract ADH from A and set flags, without storing result. If A = ADH, Zero flag sets.", reg: "Flags ← A - ADH", key: "CPI = Compare with immediate value. Cleaner than loading ADH into a register first." },
      { instr: "JNZ NEXT", why: "If Zero flag is NOT set, A ≠ ADH. Skip the counter and move to next byte.", reg: "PC → NEXT if Z=0", key: "No match = skip. Match = fall through to INR C." },
      { instr: "INR C", why: "We found ADH! Increment the match counter.", reg: "C ← C + 1", key: "Only reached on a match. JNZ guards this line." },
      { instr: "NEXT: INX H", why: "Move to next byte in block whether or not we found a match.", reg: "HL ← HL + 1", key: "Pointer always advances — we check every byte." },
      { instr: "DCR B", why: "One less byte remaining. Decrement loop counter.", reg: "B ← B - 1", key: "B counts down from 16 to 0." },
      { instr: "JNZ BACK", why: "Still bytes left? Go back and check the next one.", reg: "PC → BACK if Z=0", key: "Loop until all 16 bytes are scanned." },
      { instr: "LXI H, D000H", why: "Point HL at result storage address D000H.", reg: "HL ← D000H", key: "Redirect HL from scan pointer to output pointer." },
      { instr: "MOV M, C", why: "Write the occurrence count to D000H.", reg: "[D000H] ← C", key: "Final answer stored." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 4, title: "2's Complement of 5 Numbers", short: "2's Complement",
    addresses: "Source: F000H–F004H | Destination: D000H–D004H",
    summary: "2's complement = flip all bits (1's complement) then add 1. We do this for each of 5 numbers and store results at a new location.",
    steps: [
      { instr: "LXI H, F000H", why: "HL points to source — where our 5 original numbers are stored.", reg: "HL ← F000H", key: "HL = source pointer." },
      { instr: "LXI D, D000H", why: "DE points to destination — where we'll store the 2's complement results. We need two pointers simultaneously.", reg: "DE ← D000H", key: "DE = destination pointer. 8085 can use HL and DE as parallel pointers." },
      { instr: "MVI C, 05H", why: "Loop counter = 5 because we have 5 numbers to process.", reg: "C ← 05H", key: "C = 5 iterations." },
      { instr: "BACK: MOV A, M", why: "Load current number from source (HL address) into A.", reg: "A ← [HL]", key: "Read source byte." },
      { instr: "CMA", why: "Complement Accumulator — flips every bit. 0s become 1s, 1s become 0s. This gives 1's complement.", reg: "A ← ~A", key: "CMA = bitwise NOT. First step of 2's complement." },
      { instr: "ADI 01H", why: "Add 1 to the 1's complement. 1's complement + 1 = 2's complement. That's the definition.", reg: "A ← A + 01H", key: "Adding 1 converts 1's complement to 2's complement." },
      { instr: "STAX D", why: "Store result at address in DE register pair. STAX D = store A at [DE]. This writes to the destination.", reg: "[DE] ← A", key: "STAX D is the destination-write equivalent of MOV A, M (source-read)." },
      { instr: "INX H", why: "Move source pointer forward to next number.", reg: "HL ← HL + 1", key: "Source advances." },
      { instr: "INX D", why: "Move destination pointer forward to next storage slot.", reg: "DE ← DE + 1", key: "Destination advances in parallel with source." },
      { instr: "DCR C", why: "One number processed. Decrement counter.", reg: "C ← C - 1", key: "Countdown to zero." },
      { instr: "JNZ BACK", why: "More numbers? Go back.", reg: "PC → BACK if Z=0", key: "Loop 5 times total." },
      { instr: "RST 1", why: "All 5 numbers processed. Results at D000H–D004H.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 5, title: "Reverse Block Transfer", short: "Block Reverse",
    addresses: "Source end: D1FFH | Destination: D200H",
    summary: "We start reading the SOURCE from the END (D1FFH) and write to DESTINATION from the START (D200H). So the last byte of source becomes the first byte of destination — perfect reversal.",
    steps: [
      { instr: "LXI H, D1FFH", why: "Point HL at the LAST byte of source block. We read backwards, so we start at the end.", reg: "HL ← D1FFH", key: "Key insight: read source from back to front." },
      { instr: "LXI D, D200H", why: "Point DE at the START of destination. We write forward into the new location.", reg: "DE ← D200H", key: "Write destination front to back while reading source back to front = reversal." },
      { instr: "MVI C, 00H", why: "Initialize counter to 0. We use the 256-wrap trick: 0 → 1 → ... → 255 → wraps to 0 → JNZ fails → loop ends. Gives exactly 256 iterations.", reg: "C ← 00H", key: "00H counter with INR + JNZ gives 256 iterations (wraps around)." },
      { instr: "BACK: MOV A, M", why: "Read current byte from source (HL is pointing backwards through source).", reg: "A ← [HL]", key: "Reading from end of source moving backwards." },
      { instr: "STAX D", why: "Write that byte to current destination address (DE moving forward).", reg: "[DE] ← A", key: "Writing to start of destination moving forwards." },
      { instr: "DCX H", why: "Move source pointer BACKWARDS (decrement). DCX decrements a 16-bit register pair.", reg: "HL ← HL - 1", key: "DCX = decrement 16-bit. We go backwards through source." },
      { instr: "INX D", why: "Move destination pointer FORWARDS (increment).", reg: "DE ← DE + 1", key: "INX = increment 16-bit. We go forwards through destination." },
      { instr: "INR C", why: "Increment 8-bit counter. After 256 increments, C wraps from FFH back to 00H.", reg: "C ← C + 1", key: "At 256th iteration, C wraps to 00H, Zero flag sets." },
      { instr: "JNZ BACK", why: "If C isn't 0 yet, keep going. When C wraps to 00H after 256 iterations, Zero flag sets and we exit.", reg: "PC → BACK if Z=0", key: "The wrap-around is intentional: exactly 256 bytes transferred." },
      { instr: "RST 1", why: "Block reversed and copied.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 6, title: "Divide Block by 2 (In-Place)", short: "Halve Numbers",
    addresses: "Block: 4000H–4009H (10 numbers) | In-place",
    summary: "Dividing by 2 = shifting all bits one position to the right. We use STC+CMC to force Carry to 0, then RAR rotates right through that zero carry — giving a clean logical right shift.",
    steps: [
      { instr: "LXI H, 4000H", why: "Point HL at start of our 10-number block.", reg: "HL ← 4000H", key: "HL = pointer to current number being halved." },
      { instr: "MVI C, 0AH", why: "0AH = 10 decimal. We have 10 numbers to divide.", reg: "C ← 0AH", key: "10 iterations." },
      { instr: "BACK: MOV A, M", why: "Load current number into A for processing.", reg: "A ← [HL]", key: "Read current byte." },
      { instr: "STC", why: "SET Carry flag to 1. This is step 1 of a two-step carry-clearing trick.", reg: "CY ← 1", key: "STC alone isn't useful. It's setup for CMC." },
      { instr: "CMC", why: "COMPLEMENT (flip) the Carry flag. CY was just set to 1 by STC, so now CMC makes it 0. Net result: CY = 0. This is the only reliable way to CLEAR the carry flag in 8085.", reg: "CY ← 0", key: "STC then CMC = guaranteed CY=0. No other clean way to clear carry in 8085." },
      { instr: "RAR", why: "Rotate Accumulator Right through Carry. Every bit shifts right by one. The old bit 0 goes into Carry. The old Carry (which we just forced to 0) comes into bit 7. Result: logical right shift = divide by 2.", reg: "A ← A >> 1 (with CY=0 entering bit7)", key: "RAR with CY=0 = perfect logical right shift = ÷2 with no artifact." },
      { instr: "MOV M, A", why: "Write the halved result back to the same memory location. In-place update.", reg: "[HL] ← A", key: "In-place: same address we read from, we write back to." },
      { instr: "INX H", why: "Move to next number.", reg: "HL ← HL + 1", key: "Advance pointer." },
      { instr: "DCR C", why: "Decrement loop counter.", reg: "C ← C - 1", key: "" },
      { instr: "JNZ BACK", why: "More numbers? Loop back.", reg: "PC → BACK if Z=0", key: "10 iterations total." },
      { instr: "RST 1", why: "All 10 numbers halved in-place.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 7, title: "Find Largest Number", short: "Find Maximum",
    addresses: "Length: D000H | Block: D001H+ | Result: D060H",
    summary: "We keep track of the largest number seen so far in A. For each new number, compare it with A. If it's bigger, update A. At the end, A holds the largest.",
    steps: [
      { instr: "LDA D000H", why: "Load block length from D000H. We need to know how many numbers to scan.", reg: "A ← [D000H]", key: "Length-first design: the block tells you how big it is." },
      { instr: "MOV C, A", why: "Save the count in C as our loop counter.", reg: "C ← A (count)", key: "C = how many comparisons to make." },
      { instr: "LXI H, D001H", why: "Point HL at first data element (D001H, right after the length byte).", reg: "HL ← D001H", key: "Data starts at D001H, length is at D000H." },
      { instr: "MOV A, M", why: "Load the FIRST element as our initial 'largest seen so far'. We have to start somewhere.", reg: "A ← [D001H]", key: "First element = initial max. We'll only replace it if something bigger appears." },
      { instr: "DCR C", why: "We already consumed one element (the first one). Reduce counter so we compare the remaining elements.", reg: "C ← C - 1", key: "First element is already in A as max. Only need count-1 more comparisons." },
      { instr: "JZ STORE", why: "If count was 1, C is now 0. Only one element — it's trivially the largest. Skip loop and store.", reg: "PC → STORE if Z=1", key: "Edge case: single element block. Handle it cleanly." },
      { instr: "BACK: INX H", why: "Move to next element in block.", reg: "HL ← HL + 1", key: "Advance pointer before reading next candidate." },
      { instr: "CMP M", why: "Compare A (current max) with [HL] (next candidate). Sets flags based on A - [HL] without storing.", reg: "Flags ← A - [HL]", key: "CMP M compares A with memory directly — no need to load into register first." },
      { instr: "JNC SKIP", why: "No Carry means A ≥ [HL]. Current max is still the largest. Skip the update.", reg: "PC → SKIP if CY=0", key: "JNC = no borrow = A is still bigger or equal. Keep A." },
      { instr: "MOV A, M", why: "Carry was set meaning A < [HL]. The new element is bigger! Update our max.", reg: "A ← [HL]", key: "New champion! A gets updated to the larger value." },
      { instr: "SKIP: DCR C", why: "Decrement counter whether we updated max or not.", reg: "C ← C - 1", key: "Both paths (update and skip) converge here." },
      { instr: "JNZ BACK", why: "More elements? Keep scanning.", reg: "PC → BACK if Z=0", key: "Loop until all elements compared." },
      { instr: "STORE: STA D060H", why: "A holds the largest number found. Store it at D060H.", reg: "[D060H] ← A", key: "Result saved. D060H = the winner." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 8, title: "Copy Block (C050H–C05FH → C070H)", short: "Block Copy",
    addresses: "Source: C050H–C05FH (16 bytes) | Destination: C070H+",
    summary: "Straightforward byte-by-byte copy. Read from source using HL, write to destination using DE, advance both pointers, repeat 16 times.",
    steps: [
      { instr: "LXI H, C050H", why: "HL = source pointer, starting at C050H.", reg: "HL ← C050H", key: "HL reads from source." },
      { instr: "LXI D, C070H", why: "DE = destination pointer, starting at C070H.", reg: "DE ← C070H", key: "DE writes to destination." },
      { instr: "MVI C, 10H", why: "10H = 16 decimal. The block C050H to C05FH is exactly 16 bytes.", reg: "C ← 10H", key: "16 bytes = 10H iterations." },
      { instr: "BACK: MOV A, M", why: "Read byte from source (HL address) into A.", reg: "A ← [HL]", key: "A is the transfer bucket. Load from source." },
      { instr: "STAX D", why: "Write A to destination (DE address). STAX D = store A at [DE].", reg: "[DE] ← A", key: "STAX D dumps the bucket at destination." },
      { instr: "INX H", why: "Advance source pointer.", reg: "HL ← HL + 1", key: "Source moves forward." },
      { instr: "INX D", why: "Advance destination pointer.", reg: "DE ← DE + 1", key: "Destination moves forward in sync." },
      { instr: "DCR C", why: "One byte copied. Decrement remaining count.", reg: "C ← C - 1", key: "Countdown." },
      { instr: "JNZ BACK", why: "More bytes? Loop.", reg: "PC → BACK if Z=0", key: "16 iterations total." },
      { instr: "RST 1", why: "All 16 bytes copied from C050H–C05FH to C070H–C07FH.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 9, title: "Interchange Nibbles + Add", short: "Nibble Swap",
    addresses: "Input: 3000H | Swapped: 3001H | Sum: 3010H",
    summary: "A byte has two nibbles — upper 4 bits and lower 4 bits. Four left rotations swap them. Then we add original + swapped and store the sum.",
    steps: [
      { instr: "LDA 3000H", why: "Load the original byte. Example: if byte = ABH, upper nibble = A, lower nibble = B.", reg: "A ← [3000H]", key: "Say A = 0xAB. Upper nibble = 0xA, Lower = 0xB." },
      { instr: "MOV B, A", why: "Save original in B. After the rotations A will be different, so we preserve the original here.", reg: "B ← A (original)", key: "B = backup of original. Needed later for the addition." },
      { instr: "RLC", why: "Rotate Left: all bits shift left by 1, bit 7 wraps to bit 0.", reg: "A ← rotate left 1", key: "4 RLCs = 4 left rotations = nibble swap." },
      { instr: "RLC", why: "Second rotation.", reg: "A ← rotate left 2", key: "" },
      { instr: "RLC", why: "Third rotation.", reg: "A ← rotate left 3", key: "" },
      { instr: "RLC", why: "Fourth rotation. After 4 left rotations: upper nibble and lower nibble are swapped. ABH becomes BAH.", reg: "A ← rotate left 4 = nibbles swapped", key: "4 rotations = 4 bits shifted = nibble exchange. ABCD EFGH → EFGH ABCD." },
      { instr: "STA 3001H", why: "Store the nibble-swapped result at 3001H.", reg: "[3001H] ← A (swapped)", key: "Swapped version saved before we use A for addition." },
      { instr: "ADD B", why: "Add original (B) to swapped (A). This gives us original + interchanged.", reg: "A ← A + B", key: "A = swapped, B = original. A + B = combined result." },
      { instr: "STA 3010H", why: "Store the sum at 3010H.", reg: "[3010H] ← A (sum)", key: "Final result at 3010H." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 10, title: "Subroutine: Fill BBH/44H Alternately", short: "BB/44 Fill",
    addresses: "Locations: 2000H–2009H | Pattern: BBH, 44H alternating",
    summary: "The main program CALLS a subroutine. The subroutine fills memory with alternating BB and 44. CALL pushes return address to stack, RET pops it back — that's how subroutines work.",
    steps: [
      { instr: "CALL FILL", why: "CALL does two things: pushes the next instruction's address onto the stack (for later return), then jumps to FILL label.", reg: "Stack ← return address, PC → FILL", key: "CALL = jump with memory of where you came from. Stack stores return address." },
      { instr: "RST 1", why: "This runs AFTER the subroutine returns. Main program ends here.", reg: "STOP", key: "This line only executes after RET brings us back." },
      { instr: "FILL: LXI H, 2000H", why: "Subroutine starts. Set HL to beginning of fill area.", reg: "HL ← 2000H", key: "Subroutine sets up its own pointer." },
      { instr: "MVI C, 05H", why: "5 pairs of (BB, 44) = 10 bytes = 2000H to 2009H.", reg: "C ← 05H", key: "5 pairs, not 10 iterations — we write 2 bytes per loop." },
      { instr: "BACK: MVI M, BBH", why: "Write BBH to current address. MVI M = Move Immediate to Memory at HL.", reg: "[HL] ← BBH", key: "First byte of pair = BBH." },
      { instr: "INX H", why: "Move to next address for the 44H.", reg: "HL ← HL + 1", key: "Advance between the two bytes of each pair." },
      { instr: "MVI M, 44H", why: "Write 44H to the next address.", reg: "[HL] ← 44H", key: "Second byte of pair = 44H." },
      { instr: "INX H", why: "Move past this pair to start of next pair.", reg: "HL ← HL + 1", key: "Advance to start of next BB/44 pair." },
      { instr: "DCR C", why: "One pair done. Decrement pair counter.", reg: "C ← C - 1", key: "" },
      { instr: "JNZ BACK", why: "More pairs? Loop.", reg: "PC → BACK if Z=0", key: "5 pair iterations." },
      { instr: "RET", why: "Return from subroutine. Pops the return address from the stack and jumps there — back to the RST 1 in main.", reg: "PC ← Stack (return address)", key: "RET = the pair of CALL. Stack unwinds. Execution resumes after CALL." },
    ]
  },
  {
    id: 11, title: "Separate Nibbles and Multiply", short: "Nibble Multiply",
    addresses: "Input: 2000H | Result: 3000H",
    summary: "Extract upper nibble and lower nibble separately. Then multiply them using repeated addition (8085 has no MUL instruction). Upper × Lower = result.",
    steps: [
      { instr: "LDA 2000H", why: "Load the number whose nibbles we'll separate and multiply.", reg: "A ← [2000H]", key: "Say A = 0x35. Upper nibble = 3, Lower nibble = 5." },
      { instr: "MOV B, A", why: "Save original in B because we'll destroy A with masking operations.", reg: "B ← A (original)", key: "B = safe copy for extracting upper nibble later." },
      { instr: "ANI 0FH", why: "0FH = 00001111. AND with A zeroes the upper 4 bits, leaving only lower nibble.", reg: "A ← A AND 0FH = lower nibble", key: "ANI 0FH = lower nibble mask. Upper bits zeroed." },
      { instr: "MOV C, A", why: "Save lower nibble in C. It'll be our loop counter for repeated addition.", reg: "C ← lower nibble", key: "C = lower nibble = how many times we'll add upper nibble." },
      { instr: "MOV A, B", why: "Restore original number from B so we can extract the upper nibble.", reg: "A ← B (original)", key: "Restore to extract upper nibble." },
      { instr: "ANI F0H", why: "F0H = 11110000. AND zeroes the lower 4 bits, leaving upper nibble in bits 7–4.", reg: "A ← A AND F0H = upper nibble in high position", key: "ANI F0H = upper nibble mask. Lower bits zeroed." },
      { instr: "RRC × 4", why: "Rotate right 4 times to move upper nibble from bits 7–4 down to bits 3–0. Now it's a normal number we can use.", reg: "A ← upper nibble in bits 3-0", key: "4 right rotations shift upper nibble into lower position." },
      { instr: "MOV B, A", why: "Save upper nibble (now in lower position) in B as our multiplicand.", reg: "B ← upper nibble", key: "B = number to be repeatedly added (multiplicand)." },
      { instr: "MVI A, 00H", why: "Clear A to use as product accumulator.", reg: "A ← 00H", key: "A = running product. Starts at zero." },
      { instr: "MOV D, C", why: "Copy lower nibble into D as our loop counter for addition.", reg: "D ← C (lower nibble)", key: "D drives the addition loop." },
      { instr: "ORA D", why: "Test if lower nibble (D) is zero. If so, product is 0 — skip the multiply loop entirely.", reg: "Flags tested", key: "Edge case: if lower nibble = 0, anything × 0 = 0. Skip loop." },
      { instr: "JZ DONE", why: "Lower nibble was zero — product must be zero. Jump to store 00H result.", reg: "PC → DONE if Z=1", key: "Zero multiplier = skip addition loop." },
      { instr: "BACK: ADD B", why: "Add upper nibble (B) to accumulator (A). Repeated addition IS multiplication.", reg: "A ← A + B", key: "5 × 3 = add 5 three times. Lower nibble controls how many times." },
      { instr: "DCR D", why: "Decrement loop counter.", reg: "D ← D - 1", key: "" },
      { instr: "JNZ BACK", why: "Add again until D hits zero.", reg: "PC → BACK if Z=0", key: "Loop (lower nibble) times." },
      { instr: "DONE: STA 3000H", why: "Store product at 3000H.", reg: "[3000H] ← A (product)", key: "Result saved." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 12, title: "Fill 20 Locations with BCH", short: "Memory Fill",
    addresses: "Start: 8081H | Count: 20 (14H) | Data: BCH",
    summary: "Simplest program here. Load BCH into A once, then write it to 20 consecutive memory addresses using a loop.",
    steps: [
      { instr: "LXI H, 8081H", why: "Point HL to the starting address 8081H.", reg: "HL ← 8081H", key: "HL = write pointer." },
      { instr: "MVI C, 14H", why: "14H = 20 decimal. We need to fill 20 locations.", reg: "C ← 14H", key: "20 locations = 14H in hex." },
      { instr: "MVI A, BCH", why: "Load BCH into A once. We'll reuse this same A value for all 20 writes — no need to reload it each time.", reg: "A ← BCH", key: "Load once, use 20 times. Efficient." },
      { instr: "BACK: MOV M, A", why: "Write BCH (in A) to current HL address.", reg: "[HL] ← A (BCH)", key: "MOV M, A = write A to memory at HL." },
      { instr: "INX H", why: "Move to next address.", reg: "HL ← HL + 1", key: "Advance pointer." },
      { instr: "DCR C", why: "Decrement remaining count.", reg: "C ← C - 1", key: "" },
      { instr: "JNZ BACK", why: "More locations? Loop.", reg: "PC → BACK if Z=0", key: "20 iterations." },
      { instr: "RST 1", why: "All 20 locations filled with BCH.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 13, title: "BCD Series Sum", short: "BCD Sum",
    addresses: "Length: C000H | Data: C001H+ | Sum: C050H | Carry: C051H",
    summary: "Add BCD numbers using DAA after each addition. DAA corrects binary addition to give valid BCD result. Track if any carry occurred — store 01H at C051H if yes, 00H if no.",
    steps: [
      { instr: "LDA C000H", why: "Load the count of numbers to add.", reg: "A ← [C000H]", key: "Count-first design." },
      { instr: "MOV C, A", why: "Store count in C as loop counter.", reg: "C ← count", key: "" },
      { instr: "LXI H, C001H", why: "Point HL to first BCD number (data starts at C001H).", reg: "HL ← C001H", key: "Data after the length byte." },
      { instr: "MVI A, 00H", why: "Initialize sum accumulator to 0.", reg: "A ← 00H", key: "Running BCD sum lives in A." },
      { instr: "MVI D, 00H", why: "Initialize carry flag store to 0. D will become 01H if any addition overflows.", reg: "D ← 00H", key: "D = carry flag store. 00 = no carry yet, 01 = carry happened." },
      { instr: "BACK: ADD M", why: "Add current BCD byte to accumulator. This is binary addition — result might not be valid BCD yet.", reg: "A ← A + [HL]", key: "Binary add first, then DAA corrects it." },
      { instr: "DAA", why: "Decimal Adjust Accumulator. Corrects the binary result to proper BCD. If binary sum exceeds 99 BCD, DAA also sets the Carry flag.", reg: "A ← BCD-corrected result", key: "DAA is the magic: converts binary sum to BCD. Only works after ADD/ADC." },
      { instr: "JNC NEXT", why: "If no carry after DAA, the sum is still within two BCD digits. Skip carry tracking.", reg: "PC → NEXT if CY=0", key: "Carry from DAA means sum exceeded 99 BCD." },
      { instr: "MVI D, 01H", why: "Carry occurred! Mark D as 01H. D stays 01H for the rest of the program even if later additions don't carry.", reg: "D ← 01H", key: "Once carry happens, D = 01H permanently. It's a flag not a counter." },
      { instr: "NEXT: INX H", why: "Move to next BCD number.", reg: "HL ← HL + 1", key: "" },
      { instr: "DCR C", why: "Decrement counter.", reg: "C ← C - 1", key: "" },
      { instr: "JNZ BACK", why: "More numbers? Loop.", reg: "PC → BACK if Z=0", key: "" },
      { instr: "STA C050H", why: "Store final BCD sum at C050H.", reg: "[C050H] ← A", key: "Final two-digit BCD sum." },
      { instr: "MOV A, D", why: "Load the carry flag value from D into A for storing.", reg: "A ← D", key: "D holds 00H or 01H depending on whether overflow occurred." },
      { instr: "STA C051H", why: "Store carry indicator. 00H = sum fits in 2 BCD digits. 01H = overflow occurred.", reg: "[C051H] ← A", key: "00H or 01H. Examiner checks this." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 14, title: "Subtract → Store Positive Result", short: "Absolute Sub",
    addresses: "Minuend: 3600H | Subtrahend: 3601H | Result: 3602H",
    summary: "Subtract [3601H] from [3600H]. If result is positive, store directly. If negative (borrow occurred), take 2's complement to get the positive magnitude.",
    steps: [
      { instr: "LDA 3600H", why: "Load the minuend (number being subtracted from).", reg: "A ← [3600H]", key: "Minuend = the bigger number in normal subtraction." },
      { instr: "MOV B, A", why: "Save minuend in B.", reg: "B ← [3600H]", key: "" },
      { instr: "LDA 3601H", why: "Load the subtrahend (number to subtract).", reg: "A ← [3601H]", key: "" },
      { instr: "MOV C, A", why: "Save subtrahend in C.", reg: "C ← [3601H]", key: "B = minuend, C = subtrahend." },
      { instr: "MOV A, B", why: "Restore minuend into A so we can do the subtraction.", reg: "A ← B (minuend)", key: "A must hold what we're subtracting FROM." },
      { instr: "SUB C", why: "A ← A - C. If result is positive, no borrow. If negative, Carry flag sets (borrow).", reg: "A ← A - C", key: "Carry flag set = borrow occurred = result is negative." },
      { instr: "JNC STORE", why: "No carry = no borrow = result is positive. Store it directly.", reg: "PC → STORE if CY=0", key: "Positive result takes the fast path to storage." },
      { instr: "CMA", why: "Result was negative (borrow occurred). Take 1's complement — flip all bits.", reg: "A ← ~A", key: "Step 1 of 2's complement: flip bits." },
      { instr: "ADI 01H", why: "Add 1 to get 2's complement. This gives the positive magnitude of the negative result.", reg: "A ← A + 1 = magnitude", key: "Step 2 of 2's complement: add 1. Result is now the absolute value." },
      { instr: "STORE: STA 3602H", why: "Store the positive result at 3602H.", reg: "[3602H] ← A", key: "Always positive — either original positive result or magnitude of negative." },
      { instr: "RST 1", why: "Done.", reg: "STOP", key: "" },
    ]
  },
  {
    id: 15, title: "Add Two BCD Numbers", short: "BCD Add",
    addresses: "First: 5000H | Second: 5001H | Sum: 5002H | Carry: 5003H",
    summary: "Load both BCD numbers, add them in binary, then DAA corrects to BCD. Capture carry using ACI 00H trick.",
    steps: [
      { instr: "LDA 5000H", why: "Load first BCD number into A.", reg: "A ← [5000H]", key: "" },
      { instr: "MOV B, A", why: "Save first BCD in B to free A for loading second.", reg: "B ← first BCD", key: "" },
      { instr: "LDA 5001H", why: "Load second BCD number into A.", reg: "A ← [5001H]", key: "" },
      { instr: "ADD B", why: "Binary add both numbers. Result in A might not be valid BCD yet — DAA will fix that.", reg: "A ← A + B", key: "Binary addition first. DAA fixes it next." },
      { instr: "DAA", why: "Decimal Adjust: corrects A to valid BCD. If sum > 99, sets Carry flag and adjusts A to show the lower two BCD digits only.", reg: "A ← valid BCD sum", key: "DAA is essential for BCD arithmetic. Without it, you get wrong answers." },
      { instr: "STA 5002H", why: "Store the BCD sum (lower two digits) at 5002H.", reg: "[5002H] ← A (BCD sum)", key: "Sum stored. Now capture the carry." },
      { instr: "MVI A, 00H", why: "Clear A to zero. We're going to use it to capture the carry from DAA.", reg: "A ← 00H", key: "Set up A as a clean carry catcher." },
      { instr: "ACI 00H", why: "Add Immediate with Carry: A ← A + 00H + CY. Since A = 0 and data = 0, result = just the Carry flag value. If carry was set, A becomes 01H. If not, A stays 00H.", reg: "A ← 0 + 0 + CY = CY value", key: "ACI 00H is the trick to capture carry into A. Elegant." },
      { instr: "STA 5003H", why: "Store the carry byte. 00H = no carry (sum ≤ 99 BCD). 01H = carry (sum ≥ 100 BCD).", reg: "[5003H] ← A (carry)", key: "Together: 5002H + 5003H give complete BCD result." },
      { instr: "RST 1", why: "Done. 5002H = sum digits, 5003H = carry.", reg: "STOP", key: "" },
    ]
  },
];

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

export default function App() {
  const [selectedProg, setSelectedProg] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const w = useWidth();
  const mobile = w < 640;
  const tablet = w < 960;

  const prog = programs[selectedProg];
  const step = prog.steps[currentStep];
  const totalSteps = prog.steps.length;

  const goNext = () => { if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1); };
  const goPrev = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };
  const selectProg = (i) => { setSelectedProg(i); setCurrentStep(0); setShowAll(false); setSidebarOpen(false); };

  const sidebarW = mobile ? "100%" : tablet ? "160px" : "190px";

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: "#070b14", fontFamily: "'Courier New', monospace", color: "#c8d8f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #0a0e1a; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .pb:hover { background: rgba(0,180,220,0.12) !important; border-color: #00b4dc !important; }
        .nb:hover:not(:disabled) { background: rgba(0,212,255,0.15) !important; }
        .nb:disabled { opacity: 0.25; cursor: not-allowed; }
        .sp:hover { background: rgba(0,212,255,0.15) !important; cursor: pointer; }
        .tgl:hover { background: rgba(255,165,0,0.15) !important; }
        .overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.6);z-index:10; }
        .sidebar-mobile { position:fixed;top:0;left:0;bottom:0;z-index:20;width:220px;background:#080c18;border-right:1px solid #1a2e48;overflow-y:auto;padding:12px 8px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0a0e1a", borderBottom: "1px solid #1e3a5f", padding: mobile ? "10px 14px" : "12px 20px", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {tablet && (
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "transparent", border: "1px solid #1a3a5a", color: "#4a8ab0", borderRadius: "5px", padding: "5px 9px", cursor: "pointer", fontSize: "0.75rem", flexShrink: 0 }}>☰</button>
        )}
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: mobile ? "0.8rem" : "1rem", fontWeight: 900, color: "#00d4ff", textShadow: "0 0 15px rgba(0,212,255,0.4)", letterSpacing: "2px" }}>8085 ALP</div>
        {!mobile && <div style={{ color: "#1e4a6a", fontSize: "0.65rem" }}>◆ INTERACTIVE WALKTHROUGH</div>}
        <div style={{ marginLeft: "auto", color: "#2a5a8a", fontSize: "0.6rem", letterSpacing: "1px" }}>P{selectedProg + 1}/15 · {currentStep + 1}/{totalSteps}</div>
      </div>

      {/* Mobile sidebar overlay */}
      {tablet && sidebarOpen && (
        <>
          <div className="overlay" onClick={() => setSidebarOpen(false)} />
          <div className="sidebar-mobile">
            <div style={{ color: "#2a5a8a", fontSize: "0.55rem", letterSpacing: "2px", padding: "4px 8px 10px", textTransform: "uppercase" }}>Programs</div>
            {programs.map((p, i) => (
              <button key={p.id} className="pb" onClick={() => selectProg(i)} style={{ width: "100%", background: i === selectedProg ? "rgba(0,180,220,.1)" : "transparent", border: `1px solid ${i === selectedProg ? "#00b4dc" : "#1a2e48"}`, borderRadius: "5px", padding: "8px 10px", marginBottom: "4px", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                <div style={{ color: i === selectedProg ? "#00d4ff" : "#3a6a9a", fontSize: "0.55rem", letterSpacing: "1px", marginBottom: "2px" }}>P{String(p.id).padStart(2, "0")}</div>
                <div style={{ color: i === selectedProg ? "#c8d8f0" : "#4a7a9a", fontSize: "0.68rem", lineHeight: 1.3 }}>{p.title}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Desktop sidebar */}
        {!tablet && (
          <div style={{ width: sidebarW, flexShrink: 0, background: "#080c18", borderRight: "1px solid #1a2e48", overflowY: "auto", padding: "10px 6px" }}>
            <div style={{ color: "#2a5a8a", fontSize: "0.55rem", letterSpacing: "2px", padding: "4px 8px 10px", textTransform: "uppercase" }}>Programs</div>
            {programs.map((p, i) => (
              <button key={p.id} className="pb" onClick={() => selectProg(i)} style={{ width: "100%", background: i === selectedProg ? "rgba(0,180,220,.1)" : "transparent", border: `1px solid ${i === selectedProg ? "#00b4dc" : "#1a2e48"}`, borderRadius: "5px", padding: "7px 9px", marginBottom: "3px", cursor: "pointer", textAlign: "left", transition: "all .15s" }}>
                <div style={{ color: i === selectedProg ? "#00d4ff" : "#2a5a7a", fontSize: "0.55rem", letterSpacing: "1px", marginBottom: "2px" }}>P{String(p.id).padStart(2, "0")}</div>
                <div style={{ color: i === selectedProg ? "#c8d8f0" : "#3a6a8a", fontSize: "0.63rem", lineHeight: 1.3 }}>{p.short}</div>
              </button>
            ))}
          </div>
        )}

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Program header */}
          <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1a2e48", padding: mobile ? "10px 14px" : "14px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.6rem", color: "#00d4ff", letterSpacing: "2px", marginBottom: "3px" }}>PROGRAM {String(prog.id).padStart(2, "0")}</div>
                <div style={{ fontSize: mobile ? "0.82rem" : "0.95rem", fontWeight: "bold", color: "#e8f4ff", marginBottom: "5px", wordBreak: "break-word" }}>{prog.title}</div>
                {!mobile && <div style={{ fontSize: "0.62rem", color: "#2a7a9a", marginBottom: "6px" }}>{prog.addresses}</div>}
                <div style={{ background: "rgba(0,100,150,.1)", border: "1px solid #1a4a6a", borderRadius: "5px", padding: mobile ? "7px 10px" : "9px 13px", fontSize: mobile ? "0.72rem" : "0.75rem", color: "#8ab8d8", lineHeight: 1.6 }}>{prog.summary}</div>
              </div>
              <button className="tgl" onClick={() => setShowAll(s => !s)} style={{ background: showAll ? "rgba(255,165,0,.1)" : "transparent", border: `1px solid ${showAll ? "#ffa500" : "#1a4a6a"}`, color: showAll ? "#ffa500" : "#4a8ab0", borderRadius: "5px", padding: mobile ? "5px 8px" : "7px 12px", cursor: "pointer", fontSize: "0.6rem", letterSpacing: "1px", flexShrink: 0, transition: "all .15s" }}>
                {showAll ? "STEP" : "ALL"}
              </button>
            </div>
          </div>

          {showAll ? (
            <div style={{ flex: 1, overflowY: "auto", padding: mobile ? "12px" : "16px 20px" }}>
              {prog.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: mobile ? "8px" : "14px", marginBottom: "10px", padding: mobile ? "10px" : "12px 16px", background: "#0a0f1e", border: "1px solid #1a2e48", borderLeft: "3px solid #1a4a7a", borderRadius: "6px", flexWrap: mobile ? "wrap" : "nowrap" }}>
                  <div style={{ color: "#1e4a6a", fontSize: "0.6rem", width: "20px", flexShrink: 0, paddingTop: "2px" }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", color: "#39ff14", fontSize: mobile ? "0.72rem" : "0.78rem", width: mobile ? "100%" : "175px", flexShrink: 0, marginBottom: mobile ? "5px" : 0 }}>{s.instr}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: mobile ? "0.7rem" : "0.74rem", color: "#8ab8d8", lineHeight: 1.6, marginBottom: s.key ? "4px" : 0 }}>{s.why}</div>
                    {s.key && <div style={{ fontSize: "0.65rem", color: "#ffa500", opacity: 0.85 }}>→ {s.key}</div>}
                  </div>
                  {!mobile && <div style={{ fontSize: "0.6rem", color: "#2a6a4a", fontFamily: "'Share Tech Mono',monospace", flexShrink: 0, width: "110px", textAlign: "right" }}>{s.reg}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Step pills */}
              <div style={{ display: "flex", gap: "3px", padding: mobile ? "8px 12px" : "10px 20px", flexWrap: "wrap", borderBottom: "1px solid #1a2e48", flexShrink: 0 }}>
                {prog.steps.map((_, i) => (
                  <div key={i} className="sp" onClick={() => setCurrentStep(i)} style={{ width: mobile ? "20px" : "22px", height: mobile ? "20px" : "22px", borderRadius: "4px", background: i === currentStep ? "#00d4ff" : i < currentStep ? "rgba(0,212,255,.2)" : "rgba(30,60,90,.4)", border: `1px solid ${i === currentStep ? "#00d4ff" : i < currentStep ? "#1a6a9a" : "#1a3a5a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem", color: i === currentStep ? "#000" : i < currentStep ? "#00a0c0" : "#2a5a7a", fontWeight: i === currentStep ? "bold" : "normal", cursor: "pointer" }}>{i + 1}</div>
                ))}
              </div>

              {/* Step detail */}
              <div style={{ flex: 1, overflow: "auto", padding: mobile ? "12px" : "20px" }}>
                <div style={{ maxWidth: "700px", margin: "0 auto" }}>
                  <div style={{ color: "#1e4a6a", fontSize: "0.6rem", letterSpacing: "2px", marginBottom: "6px" }}>STEP {currentStep + 1} OF {totalSteps}</div>

                  <div style={{ background: "#050a14", border: "1px solid #00d4ff", borderRadius: "7px", padding: mobile ? "14px" : "18px 22px", marginBottom: "14px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg,#00d4ff,transparent)" }} />
                    <div style={{ color: "#2a7a9a", fontSize: "0.55rem", letterSpacing: "2px", marginBottom: "6px" }}>INSTRUCTION</div>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: mobile ? "1.1rem" : "1.4rem", fontWeight: 900, color: "#39ff14", textShadow: "0 0 18px rgba(57,255,20,.3)", letterSpacing: "2px", wordBreak: "break-all" }}>{step.instr}</div>
                  </div>

                  <div style={{ background: "rgba(0,40,20,.3)", border: "1px solid #1a5a3a", borderRadius: "7px", padding: "10px 16px", marginBottom: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ color: "#1a6a4a", fontSize: "0.55rem", letterSpacing: "2px", flexShrink: 0 }}>EFFECT</div>
                    <div style={{ fontFamily: "'Share Tech Mono',monospace", color: "#39e88a", fontSize: mobile ? "0.75rem" : "0.82rem" }}>{step.reg}</div>
                  </div>

                  <div style={{ background: "#0a0f1e", border: "1px solid #1a3a6a", borderRadius: "7px", padding: mobile ? "14px" : "18px 22px", marginBottom: "12px" }}>
                    <div style={{ color: "#1a5a9a", fontSize: "0.55rem", letterSpacing: "2px", marginBottom: "10px" }}>WHY THIS INSTRUCTION HERE</div>
                    <div style={{ fontSize: mobile ? "0.78rem" : "0.85rem", color: "#a8c8e8", lineHeight: 1.8 }}>{step.why}</div>
                  </div>

                  {step.key && (
                    <div style={{ background: "rgba(255,165,0,.05)", border: "1px solid rgba(255,165,0,.3)", borderLeft: "3px solid #ffa500", borderRadius: "6px", padding: mobile ? "11px 14px" : "13px 18px", marginBottom: "20px" }}>
                      <div style={{ color: "#7a5a1a", fontSize: "0.55rem", letterSpacing: "2px", marginBottom: "5px" }}>KEY INSIGHT</div>
                      <div style={{ fontSize: mobile ? "0.74rem" : "0.78rem", color: "#ffa500", lineHeight: 1.7 }}>{step.key}</div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
                    <button className="nb" onClick={goPrev} disabled={currentStep === 0} style={{ background: "transparent", border: "1px solid #1a4a7a", color: "#4a8ab0", borderRadius: "7px", padding: mobile ? "9px 16px" : "11px 22px", cursor: "pointer", fontSize: "0.7rem", letterSpacing: "1px", transition: "all .15s" }}>← PREV</button>
                    <div style={{ color: "#1a3a5a", fontSize: "0.6rem" }}>{currentStep + 1} / {totalSteps}</div>
                    <button className="nb" onClick={goNext} disabled={currentStep === totalSteps - 1} style={{ background: currentStep === totalSteps - 1 ? "transparent" : "rgba(0,212,255,.08)", border: `1px solid ${currentStep === totalSteps - 1 ? "#1a4a7a" : "#00d4ff"}`, color: currentStep === totalSteps - 1 ? "#2a6a9a" : "#00d4ff", borderRadius: "7px", padding: mobile ? "9px 16px" : "11px 22px", cursor: "pointer", fontSize: "0.7rem", letterSpacing: "1px", transition: "all .15s" }}>NEXT →</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}