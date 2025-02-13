using System;
using System.Threading.Tasks;
using libzkfpcsharp;

public class ZkfpWrapper
{
    public async Task<object> Init(dynamic input)
    {
        return zkfp2.Init();
    }

    public async Task<object> Terminate(dynamic input)
    {
        return zkfp2.Terminate();
    }

    public async Task<object> GetDeviceCount(dynamic input)
    {
        return zkfp2.GetDeviceCount();
    }
}
