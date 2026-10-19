<?xml version="1.0" encoding="UTF-8"?>

<SCL xmlns="http://www.iec.ch/61850/2003/SCL"
     version="2007"
     revision="B"
     release="4">

  <Header id="remove-ieds-demo"/>
  <!-- Removal scenarios (reload this file between scenarios):
       DEMO_BOUND_A: LNode options appear; DemoStationBus still has another IED.
       DEMO_BOUND_A + DEMO_BOUND_B: DemoStationBus loses all three ConnectedAPs;
         DemoProcessBus retains DEMO_UNBOUND. Both IEDs share LNode specifications.
       DEMO_UNBOUND: no LNode option; neither demo network becomes empty.
       All three DEMO_* IEDs: both demo networks become empty; choose different
         retain/delete options and inspect their Private metadata in Review SCL.
       All IEDs: all three networks become empty. Selecting every network for
         deletion reveals the separate Communication deletion option.
       Compare unchecked/checked LNode removal, then undo/redo. Existing None
         entries must survive, including one matching the bound specifications.
       Deleting DEMO_BOUND_A and DEMO_BOUND_B in separate operations also checks
         deduplication after the first removal and plugin refresh. -->
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="PUB"/>
      <Bay name="SUB"/>
      <Bay name="DEMO">
        <ConductingEquipment name="QA1" type="CBR">
          <LNode iedName="DEMO_BOUND_A" ldInst="DEMO" lnClass="TCTR" lnInst="1" lnType="TCTR_Test"/>
          <LNode iedName="DEMO_BOUND_B" ldInst="DEMO" lnClass="TCTR" lnInst="1" lnType="TCTR_Test"/>
          <LNode iedName="DEMO_BOUND_A" ldInst="DEMO" lnClass="TCTR" lnInst="2" lnType="TCTR_Test"/>
          <LNode iedName="DEMO_BOUND_B" ldInst="DEMO" lnClass="TCTR" lnInst="2" lnType="TCTR_Test"/>
          <LNode iedName="None" ldInst="DEMO" lnClass="TCTR" lnInst="1" lnType="TCTR_Test"/>
          <LNode iedName="None" ldInst="DEMO" lnClass="TCTR" lnInst="3" lnType="TCTR_Test"/>
        </ConductingEquipment>
      </Bay>
    </VoltageLevel>
  </Substation>
  <Communication>
    <Private type="oscd-remove-ieds-demo" xmlns:demo="urn:oscd-remove-ieds:demo">
      <demo:Note>Communication-level engineering data: deleting Communication removes this too.</demo:Note>
      <demo:Layout x="120" y="80"/>
    </Private>
    <SubNetwork name="StationBus" type="8-MMS">
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="PUB_A" apName="AP1">
        <GSE ldInst="LD_A" cbName="GCB_A">
          <!-- Is it valid to have a GSE address, but not a ConnectedAP address? It doesn't appear to work as expected. If the GSE Address is added but no ConnectedAP address, then the GSE address gets removed. Harsh!-->
          <!-- Not only does the GSE address block get removed, the ConnectedAP address the user just added, doesn't actually get added. With the GSE address block removed, then adding the ConnecteAP address works (second time round)-->
          <!-- Adding a GSE afterwards, works as expected and all further edits seem to work normally. -->
          <!-- <Address>
            <P type="MAC-Address">01-0C-CD-01-00-01</P>
            <P type="APPID">0001</P>
          </Address> -->
          <MinTime unit="s" multiplier="m">10</MinTime>
          <MaxTime unit="s" multiplier="m">1000</MaxTime>
        </GSE>
      </ConnectedAP>
      <ConnectedAP iedName="PUB_B" apName="AP1">
        <GSE ldInst="LD_B" cbName="GCB_B">
          <Address>
            <P type="MAC-Address">01-0C-CD-01-00-02</P>
            <P type="APPID">0002</P>
          </Address>
          <MinTime unit="s" multiplier="m">10</MinTime>
          <MaxTime unit="s" multiplier="m">1000</MaxTime>
        </GSE>
      </ConnectedAP>
      <ConnectedAP iedName="SMV_PUB" apName="AP1">
        <SMV ldInst="MU01" cbName="MSVCB01">
          <Address>
            <P type="MAC-Address">01-0C-CD-04-00-01</P>
            <P type="APPID">4000</P>
            <P type="VLAN-ID">001</P>
            <P type="VLAN-PRIORITY">4</P>
          </Address>
        </SMV>
      </ConnectedAP>
      <ConnectedAP iedName="SUB_A" apName="AP1"/>
      <ConnectedAP iedName="SUB_B" apName="AP1"/>
    </SubNetwork>
    <SubNetwork name="DemoStationBus" type="8-MMS" desc="Emptied by selecting both DEMO_BOUND IEDs">
      <Private type="oscd-remove-ieds-demo" xmlns:demo="urn:oscd-remove-ieds:demo">
        <demo:Note>DemoStationBus engineering data: retain this network to preserve this note and its layout.</demo:Note>
        <demo:Layout x="240" y="160"/>
      </Private>
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="DEMO_BOUND_A" apName="AP1"/>
      <ConnectedAP iedName="DEMO_BOUND_A" apName="AP2"/>
      <ConnectedAP iedName="DEMO_BOUND_B" apName="AP1"/>
    </SubNetwork>
    <SubNetwork name="DemoProcessBus" type="8-MMS" desc="Emptied by DEMO_BOUND_B and DEMO_UNBOUND together">
      <Private type="oscd-remove-ieds-demo" xmlns:demo="urn:oscd-remove-ieds:demo">
        <demo:Note>DemoProcessBus engineering data: this is separate from DemoStationBus metadata.</demo:Note>
        <demo:Layout x="480" y="160"/>
      </Private>
      <BitRate unit="b/s" multiplier="M">1000</BitRate>
      <ConnectedAP iedName="DEMO_BOUND_B" apName="AP2"/>
      <ConnectedAP iedName="DEMO_UNBOUND" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="DEMO_BOUND_A" manufacturer="OpenSCD" desc="Bound LNodes; two access points on DemoStationBus">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="DEMO">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test"/>
          <LN lnClass="TCTR" inst="2" lnType="TCTR_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
    <AccessPoint name="AP2"/>
  </IED>
  <IED name="DEMO_BOUND_B" manufacturer="OpenSCD" desc="Matching LNodes; connected to both demo networks">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="DEMO">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test"/>
          <LN lnClass="TCTR" inst="2" lnType="TCTR_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
    <AccessPoint name="AP2"/>
  </IED>
  <IED name="DEMO_UNBOUND" manufacturer="OpenSCD" desc="No LNode bindings; keeps DemoProcessBus connected">
    <AccessPoint name="AP1"/>
  </IED>
  <IED name="PUB_A" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <DataSet name="DS_A">
              <FCDA ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" fc="ST"/>
              <FCDA ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="q" fc="ST"/>
            </DataSet>
            <GSEControl name="GCB_A" type="GOOSE" appID="0001" confRev="1" datSet="DS_A"/>
          </LN0>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test">
            <DOI name="Beh">
              <DAI name="stVal">
                <Val>on</Val>
              </DAI>
            </DOI>
            <DOI name="HzRtg"/>
            <DOI name="ARtg"/>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="PUB_B" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_B">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <DataSet name="DS_B">
              <FCDA ldInst="LD_B" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" fc="ST"/>
              <FCDA ldInst="LD_B" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="q" fc="ST"/>
            </DataSet>
            <GSEControl name="GCB_B" type="GOOSE" appID="0002" confRev="1" datSet="DS_B"/>
          </LN0>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test">
            <DOI name="Beh">
              <DAI name="stVal">
                <Val>blocked</Val>
              </DAI>
            </DOI>
            <DOI name="HzRtg"/>
            <DOI name="ARtg"/>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="SMV_PUB" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="MU01">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <DataSet name="PhsMeas1">
              <FCDA ldInst="MU01" prefix="" lnClass="TCTR" lnInst="1" doName="AmpSv" daName="instMag.i" fc="MX"/>
              <FCDA ldInst="MU01" prefix="" lnClass="TCTR" lnInst="1" doName="AmpSv" daName="q" fc="MX"/>
              <FCDA ldInst="MU01" prefix="" lnClass="TVTR" lnInst="1" doName="VolSv" daName="instMag.i" fc="MX"/>
              <FCDA ldInst="MU01" prefix="" lnClass="TVTR" lnInst="1" doName="VolSv" daName="q" fc="MX"/>
            </DataSet>
            <SampledValueControl name="MSVCB01" smvID="SMV_PUB/MU01/MSVCB01" smpRate="80" nofASDU="1" confRev="1" multicast="true" datSet="PhsMeas1">
              <SmvOpts sampleRate="true" dataSet="true"/>
            </SampledValueControl>
          </LN0>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_SMV">
            <DOI name="AmpSv"/>
          </LN>
          <LN lnClass="TVTR" inst="1" lnType="TVTR_SMV">
            <DOI name="VolSv"/>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="SUB_A" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_SUB_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <Inputs>
              <ExtRef
                  iedName="PUB_A"
                  serviceType="GOOSE"
                  ldInst="LD_A"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="Beh"
                  daName="stVal"
                  srcLDInst="LD_A"
                  srcLNClass="LLN0"
                  srcCBName="GCB_A"/>
              <ExtRef
                  iedName="PUB_A"
                  serviceType="GOOSE"
                  ldInst="LD_A"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="Beh"
                  daName="q"
                  srcLDInst="LD_A"
                  srcLNClass="LLN0"
                  srcCBName="GCB_A"/>
            </Inputs>
          </LN0>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test">
            <DOI name="Beh"/>
            <DOI name="HzRtg"/>
            <DOI name="ARtg"/>
            <Inputs>
              <ExtRef
                  iedName="PUB_B"
                  serviceType="GOOSE"
                  ldInst="LD_B"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="Beh"
                  daName="stVal"
                  srcLDInst="LD_B"
                  srcLNClass="LLN0"
                  srcCBName="GCB_B"/>
              <ExtRef
                  iedName="SMV_PUB"
                  serviceType="SMV"
                  ldInst="MU01"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="AmpSv"
                  daName="instMag.i"
                  srcLDInst="MU01"
                  srcLNClass="LLN0"
                  srcCBName="MSVCB01"/>
              <ExtRef
                  iedName="SMV_PUB"
                  serviceType="SMV"
                  ldInst="MU01"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="AmpSv"
                  daName="q"
                  srcLDInst="MU01"
                  srcLNClass="LLN0"
                  srcCBName="MSVCB01"/>
            </Inputs>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="SUB_B" manufacturer="OpenSCD">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_SUB_B">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <Inputs>
              <ExtRef
                  iedName="PUB_B"
                  serviceType="GOOSE"
                  ldInst="LD_B"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="Beh"
                  daName="q"
                  srcLDInst="LD_B"
                  srcLNClass="LLN0"
                  srcCBName="GCB_B"/>
            </Inputs>
          </LN0>
          <LN lnClass="TCTR" inst="1" lnType="TCTR_Test">
            <DOI name="Beh"/>
            <DOI name="HzRtg"/>
            <DOI name="ARtg"/>
            <Inputs>
              <ExtRef
                  iedName="PUB_A"
                  serviceType="GOOSE"
                  ldInst="LD_A"
                  prefix=""
                  lnClass="TCTR"
                  lnInst="1"
                  doName="Beh"
                  daName="stVal"
                  srcLDInst="LD_A"
                  srcLNClass="LLN0"
                  srcCBName="GCB_A"/>
              <ExtRef
                  iedName="SMV_PUB"
                  serviceType="SMV"
                  ldInst="MU01"
                  prefix=""
                  lnClass="TVTR"
                  lnInst="1"
                  doName="VolSv"
                  daName="instMag.i"
                  srcLDInst="MU01"
                  srcLNClass="LLN0"
                  srcCBName="MSVCB01"/>
              <ExtRef
                  iedName="SMV_PUB"
                  serviceType="SMV"
                  ldInst="MU01"
                  prefix=""
                  lnClass="TVTR"
                  lnInst="1"
                  doName="VolSv"
                  daName="q"
                  srcLDInst="MU01"
                  srcLNClass="LLN0"
                  srcCBName="MSVCB01"/>
            </Inputs>
          </LN>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
    <LNodeType lnClass="TCTR" id="TCTR_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="HzRtg" type="HzRtg_Test"/>
      <DO name="ARtg" type="ARtg_Test"/>
    </LNodeType>
    <LNodeType lnClass="TCTR" id="TCTR_SMV">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="ARtg" type="ARtg_Test"/>
      <DO name="HzRtg" type="HzRtg_Test"/>
      <DO name="AmpSv" type="SAV_Test"/>
    </LNodeType>
    <LNodeType lnClass="TVTR" id="TVTR_SMV">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="VRtg" type="ASG_Test"/>
      <DO name="HzRtg" type="HzRtg_Test"/>
      <DO name="VolSv" type="SAV_Test"/>
    </LNodeType>
    <DOType cdc="SAV" id="SAV_Test">
      <DA name="instMag" fc="MX" bType="Struct" type="AnalogueValue"/>
      <DA name="q" fc="MX" bType="Quality"/>
    </DOType>
    <DOType cdc="ENS" id="Beh_Test">
      <DA name="stVal" fc="ST" dchg="true" dupd="true" bType="Enum" type="stVal_enums"/>
      <DA name="q" fc="ST" qchg="true" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
    <DOType cdc="ASG" id="ARtg_Test">
      <DA name="setVal" fc="SG" bType="INT32"/>
      <DA name="setMag" fc="SE" bType="INT32"/>
    </DOType>
    <DOType cdc="ASG" id="HzRtg_Test">
      <DA name="setMag" fc="SE" bType="Struct" type="AnalogueValueCtl"/>
      <DA name="units" fc="CF" bType="Struct" type="Unit"/>
    </DOType>
    <DOType cdc="ASG" id="ASG_Test">
      <DA name="setVal" fc="SG" bType="INT32"/>
      <DA name="setMag" fc="SE" bType="INT32"/>
    </DOType>
    <DAType id="AnalogueValue">
      <BDA name="i" bType="INT32"/>
    </DAType>
    <DAType id="AnalogueValueCtl">
      <BDA name="i" bType="INT32"/>
    </DAType>
    <DAType id="Unit">
      <BDA name="SIUnit" bType="Enum" type="SIUnitKind"/>
      <BDA name="multiplier" bType="Enum" type="MultiplierKind"/>
    </DAType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
      <EnumVal ord="2">blocked</EnumVal>
      <EnumVal ord="3">test</EnumVal>
      <EnumVal ord="4">test/blocked</EnumVal>
      <EnumVal ord="5">off</EnumVal>
    </EnumType>
    <EnumType id="SIUnitKind">
      <EnumVal ord="1">Hz</EnumVal>
    </EnumType>
    <EnumType id="MultiplierKind">
      <EnumVal ord="0">none</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>
