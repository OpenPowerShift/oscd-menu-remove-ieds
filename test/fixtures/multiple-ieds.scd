<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-remove-ieds"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1"/>
    </VoltageLevel>
  </Substation>
  <Communication>
    <SubNetwork name="StationBus" type="8-MMS">
      <BitRate unit="b/s" multiplier="M">100</BitRate>
      <ConnectedAP iedName="PUB_A" apName="AP1">
        <GSE ldInst="LD_A" cbName="GCB_A">
          <MinTime unit="s" multiplier="m">10</MinTime>
          <MaxTime unit="s" multiplier="m">1000</MaxTime>
        </GSE>
      </ConnectedAP>
      <ConnectedAP iedName="SUB_A" apName="AP1"/>
    </SubNetwork>
  </Communication>
  <IED name="PUB_A" manufacturer="ABB" type="REL670" desc="Publisher A" configVersion="1.0" originalSclVersion="2007" originalSclRevision="B" originalSclRelease="4">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <DataSet name="DS_A">
              <FCDA ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" fc="ST"/>
            </DataSet>
            <GSEControl name="GCB_A" type="GOOSE" appID="0001" confRev="1" datSet="DS_A"/>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="SUB_A" manufacturer="Siemens" type="7SJ85">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="LD_SUB_A">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test">
            <Inputs>
              <ExtRef iedName="PUB_A" serviceType="GOOSE" ldInst="LD_A" prefix="" lnClass="TCTR" lnInst="1" doName="Beh" daName="stVal" srcLDInst="LD_A" srcLNClass="LLN0" srcCBName="GCB_A"/>
            </Inputs>
          </LN0>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
    <DOType cdc="ENS" id="Beh_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Enum" type="stVal_enums"/>
      <DA name="q" fc="ST" qchg="true" bType="Quality"/>
      <DA name="t" fc="ST" bType="Timestamp"/>
    </DOType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
      <EnumVal ord="2">blocked</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>
