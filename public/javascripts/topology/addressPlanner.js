import { isValidIpv4, isValidCidr, subnetsOverlap, isAddressInSubnet } from './ipAddressing.js';

const ROUTER_NETWORK_PREFIX = '10.0.0.';
const SERVER_NETWORK_PREFIX = '10.10.0.';
const FIRST_SERVER_HOST = 10;
const LAST_HOST = 254;
const RESERVED_SECOND_OCTETS = new Set([0, 10]);

function collectUsedAddresses(definition) {
  return new Set(definition.nodes.map((node) => node.ip).filter(isValidIpv4));
}

function collectSubnets(definition) {
  return definition.nodes.map((node) => node.subnet).filter(isValidCidr);
}

function findFreeHostAddress(definition, networkPrefix, firstHost) {
  const usedAddresses = collectUsedAddresses(definition);
  for (let host = firstHost; host <= LAST_HOST; host++) {
    const candidate = `${networkPrefix}${host}`;
    if (!usedAddresses.has(candidate)) {
      return candidate;
    }
  }
  return '';
}

export function suggestRouterAddress(definition) {
  return findFreeHostAddress(definition, ROUTER_NETWORK_PREFIX, 1);
}

export function suggestServerAddress(definition) {
  return findFreeHostAddress(definition, SERVER_NETWORK_PREFIX, FIRST_SERVER_HOST);
}

// Access networks receive consecutive 10.N.0.0/24 blocks that do not clash with existing subnets or addresses
export function suggestAccessSubnet(definition) {
  const existingSubnets = collectSubnets(definition);
  const usedAddresses = [...collectUsedAddresses(definition)];
  for (let secondOctet = 1; secondOctet <= LAST_HOST; secondOctet++) {
    if (RESERVED_SECOND_OCTETS.has(secondOctet)) {
      continue;
    }
    const candidate = `10.${secondOctet}.0.0/24`;
    const clashesWithSubnet = existingSubnets.some((subnet) => subnetsOverlap(subnet, candidate));
    const containsUsedAddress = usedAddresses.some((address) => isAddressInSubnet(address, candidate));
    if (!clashesWithSubnet && !containsUsedAddress) {
      return candidate;
    }
  }
  return '';
}
