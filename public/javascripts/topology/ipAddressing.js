const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const MINIMUM_PREFIX_LENGTH = 8;
const MAXIMUM_PREFIX_LENGTH = 30;
// Network, gateway (.1) and broadcast addresses are not available for agents
const RESERVED_ADDRESSES_PER_SUBNET = 3;

export function isValidIpv4(ipAddress) {
  return typeof ipAddress === 'string' && IPV4_PATTERN.test(ipAddress);
}

export function isValidCidr(cidr) {
  if (typeof cidr !== 'string' || !cidr.includes('/')) {
    return false;
  }
  const [networkAddress, prefixLengthText] = cidr.split('/');
  const prefixLength = Number(prefixLengthText);
  return (
    isValidIpv4(networkAddress) &&
    Number.isInteger(prefixLength) &&
    prefixLength >= MINIMUM_PREFIX_LENGTH &&
    prefixLength <= MAXIMUM_PREFIX_LENGTH
  );
}

export function subnetsOverlap(firstCidr, secondCidr) {
  const first = parseCidr(firstCidr);
  const second = parseCidr(secondCidr);
  const firstEnd = first.networkValue + first.hostCount - 1;
  const secondEnd = second.networkValue + second.hostCount - 1;
  return first.networkValue <= secondEnd && second.networkValue <= firstEnd;
}

export function isAddressInSubnet(ipAddress, cidr) {
  const subnet = parseCidr(cidr);
  const addressValue = ipv4ToInteger(ipAddress);
  return addressValue >= subnet.networkValue && addressValue < subnet.networkValue + subnet.hostCount;
}

export function getAgentCapacity(cidr) {
  return Math.max(0, parseCidr(cidr).hostCount - RESERVED_ADDRESSES_PER_SUBNET);
}

export function ipv4ToInteger(ipAddress) {
  return ipAddress.split('.').reduce((accumulated, octet) => (accumulated << 8) + Number(octet), 0) >>> 0;
}

export function integerToIpv4(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

export function parseCidr(cidr) {
  const [networkAddress, prefixLengthText] = cidr.split('/');
  const prefixLength = Number(prefixLengthText);
  const hostCount = 2 ** (32 - prefixLength);
  const networkValue = (ipv4ToInteger(networkAddress) & ~(hostCount - 1)) >>> 0;
  return { networkValue, prefixLength, hostCount };
}

// The first usable address (.1) is reserved for the access gateway
export class SubnetAddressAllocator {
  constructor(cidr) {
    this.subnet = parseCidr(cidr);
    this.nextHostOffset = 2;
  }

  allocate() {
    const broadcastOffset = this.subnet.hostCount - 1;
    if (this.nextHostOffset >= broadcastOffset) {
      throw new Error('Subnet exhausted');
    }
    const address = integerToIpv4(this.subnet.networkValue + this.nextHostOffset);
    this.nextHostOffset += 1;
    return address;
  }
}
