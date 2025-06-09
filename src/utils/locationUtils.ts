export const normalizeLocationName = (location: string): string => {
  if (!location) return 'Não especificado';

  // Map of original location names to normalized names
  const locationMap: Record<string, string> = {
    'Brazil-Santo Andre-Manufacturing-Local Support': 'SA-MNF-local Sup',
    'Brazil-Santo Andre-Network/Telecom': 'SA-Net/Tel',
    'Brazil-Bahia-Manufacturing-Local Support': 'BA-MNF-local Sup',
    'Brazil-Santo Andre-Local Support': 'SA-Local Sup',
    'Brazil-Bahia-Local Support': 'BA-Local Sup',
    'Brazil-Bahia-Network/Telecom': 'BA-Net/Tel',
    'Brazil-Bandag-Local Support': 'Berrini-Local Sup',
    'Brazil-Bandag-Manufacturing-Local Support': 'Campinas-MNF-local Sup',
    'Brazil-Bandag-Network/Telecom': 'Berrini-Net/Tel',
    'Brazil-Local Support': 'BR-Local Sup',
    'Brazil-Mafra-Local Support': 'SC-Local Sup',
    'Brazil-Telephony': 'BR-Net/Tel',
    'Brazil-Ticket Manager': 'BR-TM'
  };

  // Check if the location is in our map
  if (location in locationMap) {
    return locationMap[location];
  }

  // If not found in the map, return the original
  return location;
};

export const getOriginalLocationName = (normalizedName: string): string => {
  const reverseMap: Record<string, string> = {
    'SA-MNF-local Sup': 'Brazil-Santo Andre-Manufacturing-Local Support',
    'SA-Net/Tel': 'Brazil-Santo Andre-Network/Telecom',
    'BA-MNF-local Sup': 'Brazil-Bahia-Manufacturing-Local Support',
    'SA-Local Sup': 'Brazil-Santo Andre-Local Support',
    'BA-Local Sup': 'Brazil-Bahia-Local Support',
    'BA-Net/Tel': 'Brazil-Bahia-Network/Telecom',
    'Berrini-Local Sup': 'Brazil-Bandag-Local Support',
    'Campinas-MNF-local Sup': 'Brazil-Bandag-Manufacturing-Local Support',
    'Berrini-Net/Tel': 'Brazil-Bandag-Network/Telecom',
    'BR-Local Sup': 'Brazil-Local Support',
    'SC-Local Sup': 'Brazil-Mafra-Local Support',
    'BR-Net/Tel': 'Brazil-Telephony',
    'BR-TM': 'Brazil-Ticket Manager'
  };

  // Check if the normalized name is in our reverse map
  if (normalizedName in reverseMap) {
    return reverseMap[normalizedName];
  }

  // If not found in the map, return the original
  return normalizedName;
};