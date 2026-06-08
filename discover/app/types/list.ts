export interface UserList {
  id: string;
  name: string;
  channels: string[]; // List of channel_ids belonging to this list
}
