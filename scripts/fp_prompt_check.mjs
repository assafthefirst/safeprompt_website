import { detectPII } from '../src/engine/sanitize.js'

const prompts = [
  {
    id: 'p1_words',
    text: 'Write a short poem using only 8-letter words. Include: generate, calculate, language, scenario, progress, absolute, disaster, computer, guidance, documents.',
  },
  {
    id: 'p2_swift_like_unlabeled',
    text: 'Create a fake “SWIFT-like” string for a fictional universe without labeling it: DEUTDEFFXXX ABCDGB2LXXX NEDSZAJJ XXXYYYZZ. Explain why it looks like a bank code, but do not treat it as real.',
  },
  {
    id: 'p3_numbers_only',
    text: 'Give me 10 random 9-digit numbers and 10 random 11-digit numbers for testing formatting only. No labels, no IDs, no personal info. Example: 123456789 and 12345678901.',
  },
  {
    id: 'p4_rfc_examples',
    text: 'Write instructions for a router config and include addresses that look technical but are not real:\n- “2001:db8::1” (documentation IPv6)\n- “00:11:22:33:44:55” (example MAC)\n- “192.0.2.10” (documentation IPv4)\nExplain that these are RFC example ranges.',
  },
  {
    id: 'p5_postcode_in_sentence',
    text: 'Draft a UK-style address that is clearly fictional and contains a postcode-looking token in a sentence, not an address:\n“The code SW1A 1AA appears in a puzzle clue.”\nNo mailing address, just the sentence.',
  },
  {
    id: 'p6_words_vatin_eori',
    text: 'Write a story about a company called “VATIN” and a character named “Eori”. Do not include any IDs, just the words VATIN and EORI in normal text.',
  },
  {
    id: 'p7_skus',
    text: 'Make a table of part numbers that resemble passports/licenses but are explicitly “product SKUs”, not identity docs:\nSKU: AB1234567, CD9876543, EF0000001, GH7654321.\nNo mention of passport/license.',
  },
  {
    id: 'p8_eth_like_hashes',
    text: 'Give me a list of hex strings for programming practice:\n0x52908400098527886E0F7030069857D2E4169EE7\n0x8617E340B3D01FA5F11F306F4090FD50E238070D\nExplain these are example hashes, not wallets.',
  },
  {
    id: 'p9_vocab_only',
    text: 'Write a finance tutorial that mentions the words “routing”, “account”, “CVV”, “passport” as vocabulary terms, but does NOT provide any numbers.',
  },
]

for (const p of prompts) {
  const res = detectPII(p.text)
  const reasons = res.reasons?.length ? res.reasons.join(', ') : '(none)'
  console.log(`${p.id}: detected=${res.detected} reasons=${reasons}`)
}

