Feature: Layer connection
    Scenario: Start module on level 1 layer
        Given a signaling server running
        And any peer standbying
        When start module on level 1 layer
        Then connect to a signaling server
        And connect to any level 1 layer's peer
        And standby for connection from any level layer's peer
    Scenario: Start module on level 2 layer
        Given a signaling server running
        And any peer standbying
        When start module on level 2 layer
        Then connect to a signaling server
        And connect to any level 1 layer's peer
        And connect to any level 2 layer's peer
        And standby for connection from level 2 or lower layer's peer
    Scenario: Start module on level 3 layer
        Given a signaling server running
        And any peer standbying
        When start module on level 3 layer
        Then connect to a signaling server
        And connect to a level 1 layer's peer
        And disconnect from a signaling server
        And connect to any level 2 layer's peer
        And disconnect from a level 1 layer's peer
        And connect to any level 3 layer's peer
