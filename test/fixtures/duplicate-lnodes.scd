<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="2007" revision="B" release="4">
  <Header id="test-duplicate-lnodes"/>
  <Substation name="S1">
    <VoltageLevel name="V1">
      <Bay name="B1">
        <ConductingEquipment name="QA1" type="CBR">
          <LNode iedName="IED1" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="IED2" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="IED1" ldInst="CB" lnClass="CSWI" lnInst="1" lnType="CSWI_Test"/>
          <LNode iedName="IED2" ldInst="CB" lnClass="CSWI" lnInst="1" lnType="CSWI_Test"/>
          <LNode iedName="IED1" ldInst="CB" lnClass="CILO" lnInst="1" lnType="CILO_Test"/>
          <LNode iedName="IED2" ldInst="CB" lnClass="CILO" lnInst="1" lnType="CILO_Test"/>
          <LNode iedName="None" ldInst="CBSW" lnClass="XCBR" lnInst="1" lnType="XCBR_Test"/>
          <LNode iedName="None" ldInst="CB" lnClass="CSWI" lnInst="2" lnType="CSWI_Test"/>
        </ConductingEquipment>
      </Bay>
    </VoltageLevel>
  </Substation>
  <IED name="IED1" manufacturer="VendorA">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="CBSW">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="XCBR" inst="1" lnType="XCBR_Test"/>
        </LDevice>
        <LDevice inst="CB">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="CSWI" inst="1" lnType="CSWI_Test"/>
          <LN lnClass="CILO" inst="1" lnType="CILO_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <IED name="IED2" manufacturer="VendorB">
    <AccessPoint name="AP1">
      <Server>
        <Authentication/>
        <LDevice inst="CBSW">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="XCBR" inst="1" lnType="XCBR_Test"/>
        </LDevice>
        <LDevice inst="CB">
          <LN0 lnClass="LLN0" inst="" lnType="LLN0_Test"/>
          <LN lnClass="CSWI" inst="1" lnType="CSWI_Test"/>
          <LN lnClass="CILO" inst="1" lnType="CILO_Test"/>
        </LDevice>
      </Server>
    </AccessPoint>
  </IED>
  <DataTypeTemplates>
    <LNodeType lnClass="LLN0" id="LLN0_Test">
      <DO name="Beh" type="Beh_Test"/>
    </LNodeType>
    <LNodeType lnClass="XCBR" id="XCBR_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="Pos" type="DPC_Test"/>
    </LNodeType>
    <LNodeType lnClass="CSWI" id="CSWI_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="Pos" type="DPC_Test"/>
    </LNodeType>
    <LNodeType lnClass="CILO" id="CILO_Test">
      <DO name="Beh" type="Beh_Test"/>
      <DO name="EnaOpn" type="SPS_Test"/>
    </LNodeType>
    <DOType cdc="ENS" id="Beh_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Enum" type="stVal_enums"/>
    </DOType>
    <DOType cdc="DPC" id="DPC_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="Dbpos"/>
    </DOType>
    <DOType cdc="SPS" id="SPS_Test">
      <DA name="stVal" fc="ST" dchg="true" bType="BOOLEAN"/>
    </DOType>
    <EnumType id="stVal_enums">
      <EnumVal ord="1">on</EnumVal>
    </EnumType>
  </DataTypeTemplates>
</SCL>
