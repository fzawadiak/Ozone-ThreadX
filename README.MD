Ozone ThreadX RTOS Plugin
=========================

This plugin enabled ThreadX rtos awareness in SEGGER Ozone debugger.
It was tested with version 3.22a.

Installation
------------

1. Copy file ThreadX.js to Plugins/OS in Ozone installation directory
2. Enable plugin by calling Project.SetOSPlugin("ThreadX") in Ozone console
3. Add view from menu View/ThreadX

Issues
------

If there is no "Idle Thread" defined with lowest priority stack display is not working correctly.
This usually happens when you see CPU in tx_thread_schedule.S, function __tx_ts_wait.