﻿using System;

namespace SteamMobile.Packets
{
    // S -> C
    public class Message : Packet
    {
        public override string Type { get { return "message"; } }

        public HistoryLine Line;

        public override void Handle(Connection connection)
        {
            throw new NotSupportedException();
        }
    }
}
